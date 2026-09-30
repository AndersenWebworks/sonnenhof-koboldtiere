const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { chromium } = require('playwright');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const { favicon16, pixelTemplate, palette } = require('./build-logo-set.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'vorschau', 'favicon-v2');
const pages = ['index.html', 'sonnenhof-impressum.html', 'sonnenhof-datenschutz.html'];
const svgs = ['sonnenhof-bildmarke.svg', 'sonnenhof-bildmarke-klein.svg',
  'sonnenhof-logo-quer.svg', 'sonnenhof-logo-quer-hell.svg', 'sonnenhof-logo-hoch.svg'];
const colors = ['#173f32', '#f5c95b', '#fffdf8', 'none'];
const evidence = { checks: [], pages: [], images: [], screenshots: [] };

function pass(check) {
  evidence.checks.push(check);
  console.log('PASS ' + check);
}

async function inspectRaster(relative, width, height, opaque = false, noAlpha = opaque) {
  const filename = path.join(root, relative);
  const metadata = await sharp(filename).metadata();
  assert.equal(metadata.width, width, relative);
  assert.equal(metadata.height, height, relative);
  const { data, info } = await sharp(filename).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (opaque) {
    if (noAlpha) assert.equal(metadata.hasAlpha, false, relative + ' darf keinen Alphakanal haben');
    for (let i = 3; i < data.length; i += info.channels) assert.equal(data[i], 255, relative + ' alpha');
  }
  const bytes = fs.statSync(filename).size;
  if (!relative.endsWith('sonnenhof-social.png')) assert(bytes < 100 * 1024, relative + ' >100 KB');
  evidence.images.push({ path: relative, width, height, bytes });
  return { data, info };
}

async function screenshot(locator, filename) {
  await locator.screenshot({ path: path.join(out, filename), animations: 'disabled' });
  evidence.screenshots.push(filename);
}

async function maskPreview(relative, shape) {
  const size = 256;
  let outline;
  if (shape === 'kreis') outline = '<circle cx="128" cy="128" r="128" fill="white"/>';
  else {
    // Superellipse als Vorschau der kontinuierlich gerundeten iOS-/Squircle-Ecken.
    const exponent = shape === 'ios' ? 5 : 4;
    const points = Array.from({ length: 256 }, (_, i) => {
      const angle = i * Math.PI * 2 / 256;
      const coordinate = value => 128 + 128 * Math.sign(value) * Math.abs(value) ** (2 / exponent);
      return coordinate(Math.cos(angle)).toFixed(3) + ',' + coordinate(Math.sin(angle)).toFixed(3);
    });
    outline = '<polygon points="' + points.join(' ') + '" fill="white"/>';
  }
  const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' + outline + '</svg>');
  const filename = relative.replace('.png', '') + '-' + shape + '-256.png';
  await sharp(path.join(root, relative)).resize(size, size).ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }]).png().toFile(path.join(out, filename));
  evidence.screenshots.push(filename);
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const master = await inspectRaster('assets/img/logo/sonnenhof-bildmarke-512.png', 512, 512);
  await inspectRaster('assets/img/logo/sonnenhof-bildmarke-192.png', 192, 192);
  await inspectRaster('assets/img/logo/sonnenhof-bildmarke-96.png', 96, 96);
  await inspectRaster('assets/img/logo/sonnenhof-social.png', 1200, 630, true, false);
  const apple = await inspectRaster('apple-touch-icon.png', 180, 180, true);
  let left = 180, right = 0;
  for (let y = 0; y < 180; y++) for (let x = 0; x < 180; x++) {
    const rgb = [...apple.data.subarray((y * 180 + x) * 4, (y * 180 + x) * 4 + 3)];
    if (rgb.some((value, c) => value !== palette.g[c])) { left = Math.min(left, x); right = Math.max(right, x); }
  }
  assert(left >= 18 && left <= 27 && 179 - right >= 18 && 179 - right <= 27,
    'Apple-Motiv mit 10–15 % horizontalem Innenabstand');
  for (const p of [0, 179, 180 * 179, 180 * 180 - 1]) {
    assert.deepEqual([...apple.data.subarray(p * 4, p * 4 + 4)], palette.g, 'Apple-Ecken deckend grün');
  }
  // Nur die antialiasierte Kreisgrenze darf teiltransparent sein.
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      if (Math.hypot(x + .5 - 256, y + .5 - 256) < 232) {
        assert.equal(master.data[(y * 512 + x) * 4 + 3], 255, 'Alphaloch im Kreis');
      }
    }
  }
  assert.equal(master.data[3], 0, 'Außerhalb des Kreises transparent');
  pass('Logo-PNGs: Maße, Größenlimit, Apple ohne Alphakanal und Masterkreis ohne Alphaloch');

  const ico = fs.readFileSync(path.join(root, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  const frames = new Map();
  let nextOffset = 6 + 3 * 16;
  for (const [i, size] of [16, 32, 48].entries()) {
    const offset = 6 + i * 16;
    assert.equal(ico[offset], size);
    assert.equal(ico[offset + 1], size);
    const start = ico.readUInt32LE(offset + 12);
    const length = ico.readUInt32LE(offset + 8);
    assert.equal(start, nextOffset, 'ICO-Bilder dürfen sich nicht überlappen');
    assert(start + length <= ico.length, 'ICO-Bild liegt innerhalb der Datei');
    assert.equal(ico.readUInt16LE(offset + 4), 1);
    assert.equal(ico.readUInt16LE(offset + 6), 32);
    const frame = ico.subarray(start, start + length);
    frames.set(size, frame);
    nextOffset += length;
    const metadata = await sharp(frame).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    const pixels = await sharp(frame).ensureAlpha().raw().toBuffer();
    const allowed = new Set(Object.values(palette).map(color => color.join(',')));
    for (let p = 0; p < pixels.length; p += 4) {
      assert(allowed.has([...pixels.subarray(p, p + 4)].join(',')), size + ' px: Zwischenfarbe oder Teiltransparenz');
    }
    if (size === 16) assert.deepEqual(pixels, pixelTemplate(favicon16), '16er ICO entspricht der Pixelvorlage');
  }
  assert.equal(nextOffset, ico.length, 'Keine ungenutzten ICO-Daten');
  // Unabhängige Formprüfung: Ohrenlängen und getrennte Köpfe im 16er Raster.
  assert.equal(favicon16[8].slice(2, 6), 'wwww', 'Hundekrone');
  assert.equal(favicon16[9][1] + favicon16[11][1] + favicon16[9][6] + favicon16[11][6], 'wwww', 'Hängende Hundeohren');
  assert.equal(favicon16[10].slice(1, 7), 'wgwwgw', 'Grüne Einschnitte zwischen Kopf und Schlappohren');
  assert.equal(favicon16[7].slice(8, 11), 'wsw', 'Zwei getrennte Katzenohrspitzen');
  for (let y = 5; y <= 8; y++) assert.equal(favicon16[y].slice(12, 15), 'wgw', 'Senkrechte Hasenohren');
  for (let y = 9; y <= 11; y++) assert.equal(favicon16[y][7] + favicon16[y][11], 'gg', 'Getrennte Köpfe');
  pass('ICO 16/32/48: decodierbar, ganze Pixel, Markenfarben; 16 px eigenes geprüftes Ohrenraster');
  assert.equal(fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8'),
    fs.readFileSync(path.join(root, 'assets/img/logo/sonnenhof-bildmarke-klein.svg'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'Sonnenhof der Koboldtiere');
  assert.equal(manifest.short_name, 'Sonnenhof');
  assert.equal(manifest.theme_color, '#173f32');
  assert.equal(manifest.background_color, '#f8f4eb');
  assert.equal(manifest.id, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.description, 'Lebenshof in Heusweiler für Tiere mit Handicap.');
  assert.deepEqual(manifest.icons.map(icon => [icon.src, icon.sizes, icon.purpose]),
    [['icon-192.png', '192x192', 'any'], ['icon-512.png', '512x512', 'any'],
      ['icon-512-maskable.png', '512x512', 'maskable']]);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png');
    const [width, height] = icon.sizes.split('x').map(Number);
    const image = await inspectRaster(icon.src, width, height, icon.purpose === 'maskable');
    if (icon.purpose === 'maskable') {
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (Math.hypot(x + .5 - width / 2, y + .5 - height / 2) >= width * .4) {
          assert.deepEqual([...image.data.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)],
            palette.g.slice(0, 3), 'Maskable-Motiv außerhalb der sicheren 80-%-Zone');
        }
      }
    }
  }
  pass('Manifest: id, scope, Beschreibung; 192/512 any, 512 maskable ohne Alpha und mit sicherer Zone');

  const referencedIcons = new Set(manifest.icons.map(icon => icon.src));
  let svg16Frame;

  const browser = await chromium.launch({ headless: true });
  try {
    const tab = await browser.newPage();
    const faviconSource = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');
    const svgPixels = await tab.evaluate(async source => {
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 16;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, 16, 16);
      return Array.from(context.getImageData(0, 0, 16, 16).data);
    }, faviconSource);
    const svgColors = new Set(Object.values(palette).map(color => color.join(',')));
    for (let p = 0; p < svgPixels.length; p += 4) {
      assert(svgColors.has(svgPixels.slice(p, p + 4).join(',')), 'SVG in Chromium bei 16 px ohne Matschkanten');
    }
    svg16Frame = await sharp(Buffer.from(svgPixels), { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer();
    pass('SVG in Chromium bei 16 px: nur Markenfarben und binäre Transparenz');
    for (const name of [...svgs, '../../../favicon.svg']) {
      const source = fs.readFileSync(path.join(root, 'assets/img/logo', name), 'utf8');
      const svg = await tab.evaluate(source => {
        const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
        const root = doc.documentElement;
        return { error: !!doc.querySelector('parsererror'),
          title: doc.querySelector('title')?.textContent,
          viewBox: root.getAttribute('viewBox'), fixed: root.hasAttribute('width') || root.hasAttribute('height'),
          forbidden: !!doc.querySelector('text,image,foreignObject,metadata,script'),
          colors: [...doc.querySelectorAll('[fill],[stroke]')].flatMap(el =>
            [el.getAttribute('fill'), el.getAttribute('stroke')].filter(Boolean)) };
      }, source);
      assert(!svg.error && svg.title && svg.viewBox && !svg.fixed && !svg.forbidden, name);
      for (const color of svg.colors) assert(colors.includes(color), name + ' ' + color);
    }
    pass('6 SVGs: gültiges XML, Titel, viewBox, nur erlaubte Farben, keine Texte/Bilder/Metadaten');

    const errors = [];
    tab.on('pageerror', error => errors.push(error.message));
    tab.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    tab.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
    for (const width of [1440, 390]) {
      await tab.setViewportSize({ width, height: 1000 });
      for (const name of pages) {
        await tab.goto(pathToFileURL(path.join(root, name)).href, { waitUntil: 'load' });
        await tab.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(async image => {
            image.loading = 'eager';
            await image.decode();
          }));
        });
        const result = await tab.evaluate(() => ({ title: document.title, text: document.body.innerText,
          overflow: document.documentElement.scrollWidth > innerWidth,
          refs: [...document.querySelectorAll('[src],[href]')].flatMap(el =>
            ['src', 'href'].filter(attr => el.hasAttribute(attr)).map(attr => el.getAttribute(attr))),
          logos: [...document.querySelectorAll('header img,footer img')].map(img => ({
            src: img.getAttribute('src'), width: img.clientWidth, height: img.clientHeight, ok: img.complete && img.naturalWidth > 0 })),
          icons: [...document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]')]
            .map(el => ({ href: el.getAttribute('href'), rel: el.getAttribute('rel'),
              sizes: el.getAttribute('sizes'), type: el.getAttribute('type') })),
          themeColor: document.querySelector('meta[name="theme-color"]')?.content,
          jsonld: document.querySelector('script[type="application/ld+json"]')?.textContent,
          ogImage: document.querySelector('meta[property="og:image"]')?.content }));
        assert(result.title.includes('Sonnenhof'), name);
        assert(result.text.length > 500, name + ' leer');
        assert(!result.overflow, name + ' horizontaler Überlauf bei ' + width);
        assert(!result.text.includes('\u2014'), name + ' Em-Dash');
        assert(!result.text.includes('\ufffd'), name + ' Zeichensatz');
        assert(result.text.includes('für') || result.text.includes('Unterstützen'), name + ' Umlaute');
        assert.equal(result.logos.length, 2, name);
        for (const logo of result.logos) {
          assert.equal(logo.src, 'assets/img/logo/sonnenhof-bildmarke.svg');
          assert(logo.ok && logo.width >= 36 && logo.width <= 48 && logo.width === logo.height, name);
        }
        assert.deepEqual(result.icons, [
          { href: 'favicon.ico', rel: 'icon', sizes: '32x32', type: null },
          { href: 'favicon.svg?v=20260930', rel: 'icon', sizes: null, type: 'image/svg+xml' },
          { href: 'apple-touch-icon.png', rel: 'apple-touch-icon', sizes: null, type: null },
          { href: 'site.webmanifest', rel: 'manifest', sizes: null, type: null },
        ], name + ': einheitlicher Icon-Block');
        assert.equal(result.themeColor, '#173f32');
        for (const icon of result.icons) {
          const relative = icon.href.split('?')[0];
          assert(fs.existsSync(path.join(root, relative)), name + ': Icon fehlt ' + relative);
          if (icon.rel !== 'manifest') referencedIcons.add(relative);
        }
        for (const ref of result.refs) {
          const url = new URL(ref, tab.url());
          if (url.protocol !== 'file:') continue;
          const hash = decodeURIComponent(url.hash.slice(1));
          url.hash = ''; url.search = '';
          assert(fs.existsSync(fileURLToPath(url)), name + ': fehlender Pfad ' + ref);
          if (hash) {
            const html = fs.readFileSync(fileURLToPath(url), 'utf8');
            assert(html.includes('id="' + hash + '"'), name + ': toter Anker ' + ref);
          }
        }
        if (name === 'index.html') {
          assert.equal(JSON.parse(result.jsonld).logo,
            'https://sonnenhof-der-koboldtiere.de/assets/img/logo/sonnenhof-bildmarke-512.png');
          assert(result.ogImage.endsWith('/seelenheil-lara-mit-hunden-im-schnee.jpg'));
        }
        const stem = name.replace('.html', '') + '-' + width;
        await screenshot(tab.locator('header'), stem + '-header.png');
        await screenshot(tab.locator('footer'), stem + '-footer.png');
        if (name !== 'index.html') {
          await tab.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await tab.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await tab.screenshot({ path: path.join(out, stem + '-seite.png'), fullPage: true, animations: 'disabled' });
          evidence.screenshots.push(stem + '-seite.png');
        }
        evidence.pages.push({ page: name, width, title: result.title, refs: result.refs.length, logos: result.logos });
        pass(name + ' bei ' + width + ' px: Bilder, Pfade, Anker, Icons, Text und Überlauf');
      }
    }
    await tab.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await tab.locator('.menu-button').click();
    assert.equal(await tab.locator('.menu-button').getAttribute('aria-expanded'), 'true');
    await tab.locator('.main-nav a[href="#tiere"]').click();
    assert(new URL(tab.url()).hash === '#tiere');
    assert.equal(await tab.locator('.menu-button').getAttribute('aria-expanded'), 'false');
    pass('Mobile Navigation: Menü öffnen, Tierbereich anspringen, Menü schließt');
    assert.deepEqual(errors, []);
    pass('Keine Browser-, Konsolen- oder fehlgeschlagenen Dateiladefehler');
  } finally { await browser.close(); }

  function iconFiles(directory, relative = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      if (entry.name === 'backup' || entry.name.startsWith('.')) return [];
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) return iconFiles(path.join(directory, entry.name), name);
      return /^(?:favicon(?:[-.].*)?|apple-touch-icon.*|icon-\d+.*)\.(?:png|svg|ico)$/i.test(entry.name) ? [name] : [];
    });
  }
  assert.deepEqual(iconFiles(root).sort(), [...referencedIcons].sort(), 'Keine unreferenzierten Icon-Dateien');
  pass('Alle Icon-Links auflösbar, drei identische Head-Blöcke und keine unreferenzierten Icons');

  for (const name of svgs) {
    const source = fs.readFileSync(path.join(root, 'assets/img/logo', name), 'utf8');
    for (const background of ['#fffdf8', '#173f32']) {
      if (name === 'sonnenhof-logo-quer.svg' && background === '#173f32') continue;
      if (name === 'sonnenhof-logo-quer-hell.svg' && background === '#fffdf8') continue;
      const filename = name.replace('.svg', '') + (background === '#173f32' ? '-dunkel.png' : '-hell.png');
      const pixels = new Resvg(source, { fitTo: { mode: 'width', value: 800 }, background }).render().asPng();
      fs.writeFileSync(path.join(out, filename), pixels);
      evidence.screenshots.push(filename);
    }
  }
  for (const [size, frame] of frames) {
    for (const [label, background] of [['hell', '#fffdf8'], ['dunkel', '#202124']]) {
      const filename = 'favicon-' + size + '-' + label + '-256.png';
      await sharp(frame).resize(256, 256, { kernel: 'nearest' }).flatten({ background })
        .png().toFile(path.join(out, filename));
      evidence.screenshots.push(filename);
    }
  }
  for (const [label, background] of [['hell', '#fffdf8'], ['dunkel', '#202124']]) {
    const filename = 'favicon-svg-16-' + label + '-256.png';
    await sharp(svg16Frame).resize(256, 256, { kernel: 'nearest' }).flatten({ background })
      .png().toFile(path.join(out, filename));
    evidence.screenshots.push(filename);
  }
  await maskPreview('apple-touch-icon.png', 'ios');
  await maskPreview('icon-512-maskable.png', 'kreis');
  await maskPreview('icon-512-maskable.png', 'squircle');
  pass('Vorschauen: ICO 16/32/48 hell/dunkel in 256 px, SVG auf beiden Tabgründen, iOS und Maskable-Masken');
  fs.writeFileSync(path.join(out, 'pruefung.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('Ergebnis: ' + evidence.checks.length + ' Prüfgruppen bestanden; ' + evidence.screenshots.length + ' PNG-Vorschauen.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
