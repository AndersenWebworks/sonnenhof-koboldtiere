const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { chromium } = require('playwright');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const out = 'C:/Users/mail/.clautz-worktrees/_inputs/codex-tools/runs/sonnenhof-previews';
const pages = ['index.html', 'sonnenhof-impressum.html', 'sonnenhof-datenschutz.html'];
const svgs = ['sonnenhof-bildmarke.svg', 'sonnenhof-bildmarke-klein.svg',
  'sonnenhof-logo-quer.svg', 'sonnenhof-logo-quer-hell.svg', 'sonnenhof-logo-hoch.svg'];
const colors = ['#173f32', '#f5c95b', '#fffdf8', 'none'];
const evidence = { checks: [], pages: [], images: [], screenshots: [] };

function pass(check) {
  evidence.checks.push(check);
  console.log('PASS ' + check);
}

async function inspectRaster(relative, width, height, opaque = false) {
  const filename = path.join(root, relative);
  const metadata = await sharp(filename).metadata();
  assert.equal(metadata.width, width, relative);
  assert.equal(metadata.height, height, relative);
  const { data, info } = await sharp(filename).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (opaque) {
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

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const master = await inspectRaster('assets/img/logo/sonnenhof-bildmarke-512.png', 512, 512);
  await inspectRaster('assets/img/logo/sonnenhof-bildmarke-192.png', 192, 192);
  await inspectRaster('assets/img/logo/sonnenhof-bildmarke-96.png', 96, 96);
  await inspectRaster('assets/img/logo/sonnenhof-social.png', 1200, 630, true);
  await inspectRaster('favicon-16.png', 16, 16);
  await inspectRaster('favicon-32.png', 32, 32);
  await inspectRaster('apple-touch-icon.png', 180, 180, true);
  // Nur die antialiasierte Kreisgrenze darf teiltransparent sein.
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      if (Math.hypot(x + .5 - 256, y + .5 - 256) < 232) {
        assert.equal(master.data[(y * 512 + x) * 4 + 3], 255, 'Alphaloch im Kreis');
      }
    }
  }
  assert.equal(master.data[3], 0, 'Außerhalb des Kreises transparent');
  pass('7 PNGs: Maße, Größenlimit, deckendes Apple-Icon und Kreis ohne Alphaloch');

  const ico = fs.readFileSync(path.join(root, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (const [i, size] of [16, 32, 48].entries()) {
    const offset = 6 + i * 16;
    assert.equal(ico[offset], size);
    assert.equal(ico[offset + 1], size);
    const start = ico.readUInt32LE(offset + 12);
    const length = ico.readUInt32LE(offset + 8);
    const metadata = await sharp(ico.subarray(start, start + length)).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
  }
  pass('favicon.ico enthält decodierbare Bilder mit 16, 32 und 48 px');
  assert.equal(fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8'),
    fs.readFileSync(path.join(root, 'assets/img/logo/sonnenhof-bildmarke-klein.svg'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'Sonnenhof der Koboldtiere');
  assert.equal(manifest.short_name, 'Sonnenhof');
  assert.equal(manifest.theme_color, '#173f32');
  assert.equal(manifest.background_color, '#f8f4eb');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
  for (const icon of manifest.icons) assert(fs.existsSync(path.join(root, icon.src)));
  pass('Favicon-SVG identisch zur kleinen Bildmarke; Webmanifest gültig');

  const browser = await chromium.launch({ headless: true });
  try {
    const tab = await browser.newPage();
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
            .map(el => el.getAttribute('href')),
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
        assert.deepEqual(result.icons, ['favicon.ico', 'favicon.svg?v=20260930', 'apple-touch-icon.png', 'site.webmanifest']);
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
  for (const size of [16, 32]) {
    const filename = 'favicon-' + size + '-nearest.png';
    await sharp(path.join(root, 'favicon-' + size + '.png')).resize(320, 320, { kernel: 'nearest' })
      .flatten({ background: '#fffdf8' }).png().toFile(path.join(out, filename));
    evidence.screenshots.push(filename);
  }
  fs.writeFileSync(path.join(out, 'pruefung.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('Ergebnis: ' + evidence.checks.length + ' Prüfgruppen bestanden; ' + evidence.screenshots.length + ' PNG-Vorschauen.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
