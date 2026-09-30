const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { chromium } = require('playwright');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const { favicon16, faviconVariants, selectedVariant, pixelTemplate, palette } = require('./build-logo-set.cjs');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'vorschau', 'favicon-v3');
const pages = ['index.html', 'sonnenhof-impressum.html', 'sonnenhof-datenschutz.html'];
const svgs = ['sonnenhof-bildmarke.svg', 'sonnenhof-bildmarke-klein.svg',
  'sonnenhof-logo-quer.svg', 'sonnenhof-logo-quer-hell.svg', 'sonnenhof-logo-hoch.svg'];
const colors = ['#173f32', '#f5c95b', '#fffdf8', 'none'];
const evidence = { checks: [], pages: [], images: [], screenshots: [] };

async function comparison(filename, items) {
  const width = 704, rowHeight = 340;
  const layers = [];
  for (const [row, item] of items.entries()) {
    const top = row * rowHeight;
    const label = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="704" height="340">' +
      '<rect width="704" height="340" fill="#ffffff"/>' +
      '<text x="24" y="27" font-family="Arial" font-size="18" fill="#173f32">' + item.name + '</text>' +
      '<text x="24" y="327" font-family="Arial" font-size="14" fill="#173f32">Hell</text>' +
      '<text x="360" y="327" font-family="Arial" font-size="14" fill="#173f32">Dunkel</text></svg>').render().asPng();
    layers.push({ input: label, left: 0, top });
    for (const [column, background] of ['#fffdf8', '#202124'].entries()) {
      const input = await sharp(item.frame).resize(256, 256, { kernel: 'nearest' })
        .flatten({ background }).png().toBuffer();
      layers.push({ input, left: 24 + column * 336, top: top + 40 });
      const native = await sharp(item.frame).flatten({ background }).png().toBuffer();
      layers.push({ input: native, left: 296 + column * 336, top: top + 160 });
    }
  }
  await sharp({ create: { width, height: items.length * rowHeight, channels: 4, background: '#ffffff' } })
    .composite(layers).png().toFile(path.join(out, filename));
  evidence.screenshots.push(filename);
}

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
  const temp = path.join(out, 'tmp');
  fs.mkdirSync(temp, { recursive: true });
  // Auch Playwrights Profil, Cache und temporäre Dateien bleiben im Projektordner.
  process.env.TEMP = process.env.TMP = temp;
  const protectedFiles = [...pages, 'site.webmanifest', 'apple-touch-icon.png',
    'icon-192.png', 'icon-512.png', 'icon-512-maskable.png',
    ...fs.readdirSync(path.join(root, 'assets/img/logo')).map(name => 'assets/img/logo/' + name)];
  for (const relative of protectedFiles) {
    const before = execFileSync('git', ['show', 'dac893e:' + relative], { cwd: root, windowsHide: true });
    const current = fs.readFileSync(path.join(root, relative));
    if (/\.(html|webmanifest|svg)$/.test(relative)) {
      assert(current.toString('utf8').replace(/\r\n/g, '\n') === before.toString('utf8'),
        relative + ' muss bis auf Git-Zeilenenden unverändert bleiben');
    } else assert(current.equals(before), relative + ' muss bytegleich bleiben');
  }
  pass('Seitentexte, Manifest und sämtliche Logos unverändert; Apple-Touch- und App-Icons bytegleich zu dac893e');
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
    if (size === 16) {
      const allowed = new Set(Object.values(palette).map(color => color.join(',')));
      for (let p = 0; p < pixels.length; p += 4) {
        assert(allowed.has([...pixels.subarray(p, p + 4)].join(',')), '16 px: unerlaubte Farbe oder Teiltransparenz');
      }
      assert.deepEqual(pixels, pixelTemplate(favicon16), '16er ICO entspricht der gewählten Pixelvorlage');
    } else {
      const source = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');
      const expected = await sharp(new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng())
        .ensureAlpha().raw().toBuffer();
      assert.deepEqual(pixels, expected, size + ' px direkt aus SVG, ohne Quantisierung oder Hochskalierung');
      const scaled16 = await sharp(frames.get(16)).resize(size, size, { kernel: 'nearest' })
        .ensureAlpha().raw().toBuffer();
      assert.notDeepEqual(pixels, scaled16, size + ' px darf kein vergrößertes 16er Raster sein');
      for (const [x, y] of [[5, 19], [9, 19], [15, 19], [19, 19], [23, 19], [27, 19]]) {
        const p = (Math.floor(y * size / 32) * size + Math.floor(x * size / 32)) * 4;
        const eye = [...pixels.subarray(p, p + 3)];
        assert(eye.every((value, c) => Math.abs(value - palette.g[c]) < 80), size + ' px: dunkles Auge fehlt');
      }
    }
  }
  assert.equal(nextOffset, ico.length, 'Keine ungenutzten ICO-Daten');
  assert(faviconVariants.length >= 3, 'Mindestens drei eigenständige Varianten');
  const variants = [];
  for (const variant of faviconVariants) {
    const data = pixelTemplate(variant.rows);
    const eyes = variant.id === 'a' ? [[2, 10], [4, 10], [8, 10], [10, 10], [12, 10], [14, 10]]
      : [[2, 10], [4, 10], [8, 8], [10, 8], [12, 11], [14, 11]];
    for (const [x, y] of eyes) assert.equal(variant.rows[y][x], 'g', variant.name + ': sechs Augenpixel');
    const frame = await sharp(data, { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(path.join(out, 'variante-' + variant.id + '-16.png'), frame);
    variants.push({ name: variant.name, frame });
  }
  await comparison('vergleich-16-varianten.png', variants);
  // Formmerkmale der gewählten Zeichnung unabhängig vom ICO-Vergleich prüfen.
  assert.equal(favicon16[8].slice(1, 6), 'gwwws', 'Abgeschrägte Hundekrone vor der Sonne');
  assert.equal(favicon16[12].slice(1, 6), 'gwwwg', 'Abgeschrägtes Hundekinn');
  for (let y = 9; y <= 11; y++) assert.equal(favicon16[y][0] + favicon16[y][6], 'ee', 'Abgesetzte Schlappohren');
  assert.equal(favicon16[5].slice(7, 11), 'wssw', 'Zwei Katzenohrspitzen vor der Sonne');
  assert.equal(favicon16[6].slice(7, 11), 'wwww', 'Dreiecksohren verbreitern sich nach unten');
  assert.equal(favicon16[10].slice(7, 11), 'gwww', 'Verjüngtes Katzenkinn');
  for (let y = 4; y <= 8; y++) assert.equal(favicon16[y].slice(12, 15), 'wgw', 'Lange, getrennte Hasenohren');
  assert.equal(favicon16[9].slice(12, 15), 'gwg', 'Abgeschrägte Hasenkrone');
  assert.equal(favicon16[12].slice(11, 16), 'gwww.', 'Verjüngtes Hasenkinn');
  for (const [animal, eyes, y] of [['Hund', [2, 4], 10], ['Katze', [8, 10], 8], ['Hase', [12, 14], 11]]) {
    for (const x of eyes) {
      assert.equal(favicon16[y][x], 'g', animal + ': dunkelgrünes Augenpixel');
      assert.equal(favicon16[y - 1][x], 'w', animal + ': Gesicht über dem Auge');
      assert.equal(favicon16[y + 1][x], 'w', animal + ': Gesicht unter dem Auge');
      assert.equal(favicon16[y][x + 1], 'w', animal + ': Gesicht rechts vom Auge');
      assert('we'.includes(favicon16[y][x - 1]), animal + ': Gesicht oder Kante links vom Auge');
    }
  }
  pass('ICO 16/32/48: 16 px mit sechs Augenpixeln, runden Köpfen und Ohren; 32/48 exakt aus Vektorquelle');
  assert.equal(fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8').replace(/\r\n/g, '\n'),
    execFileSync('git', ['show', 'f2065d7:assets/img/logo/sonnenhof-bildmarke-klein.svg'],
      { cwd: root, encoding: 'utf8', windowsHide: true }), 'Browser-SVG entspricht der früheren kleinen SVG');
  evidence.selectedVariant = selectedVariant;
  evidence.visualReview = {
    selection: 'B: Die versetzten Gesichter lassen sechs vollständig eingefasste Augenpixel zu. ' +
      'Der Hund hat einen breiten, abgerundeten Kopf und abgesetzte Schlappohren; ' +
      'Katze und Hase unterscheiden sich durch kurze Spitzen und lange, getrennte Ohren. ' +
      'A verliert die äußeren Hasenaugen im Hintergrund; zusätzliche Nasen in C zerlegen die kleinen Gesichter.',
    svg16: 'Die Vektor-SVG ist in Chromium bei 16 px weicher und weniger deutlich als Pixelraster B. ' +
      'Sie bleibt für Browser erhalten; 32 und 48 px zeigen die ursprünglichen Augen und Nasen klar.',
  };
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
    assert(svgPixels.some((value, i) => i % 4 === 3 && value > 0), 'Browser-SVG darf nicht leer sein');
    svg16Frame = await sharp(Buffer.from(svgPixels), { raw: { width: 16, height: 16, channels: 4 } }).png().toBuffer();
    await comparison('vergleich-raster-svg-16.png', [
      { name: 'Gewähltes Pixelraster ' + selectedVariant.toUpperCase() + ' (16 px)', frame: frames.get(16) },
      { name: 'favicon.svg in Chromium (16 px)', frame: svg16Frame },
    ]);
    pass('SVG in Chromium bei echten 16 px gerendert und dem ICO-Raster auf hell/dunkel gegenübergestellt');
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
      const zoom = size === 48 ? 288 : 256;
      const filename = 'favicon-' + size + '-' + label + '-' + zoom + '.png';
      await sharp(frame).resize(zoom, zoom, { kernel: 'nearest' }).flatten({ background })
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
  pass('Vorschauen: drei 16er Varianten und Browser-SVG im Vergleich; ICO ganzzahlig vergrößert auf hell/dunkel');
  fs.writeFileSync(path.join(out, 'pruefung.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('Ergebnis: ' + evidence.checks.length + ' Prüfgruppen bestanden; ' + evidence.screenshots.length + ' PNG-Vorschauen.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
