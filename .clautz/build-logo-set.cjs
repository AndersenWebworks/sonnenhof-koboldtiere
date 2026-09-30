const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const opentype = require('opentype.js');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const { optimize } = require('svgo');

const root = path.resolve(__dirname, '..');
const logoDir = path.join(root, 'assets/img/logo');
let font;
const green = '#173f32';
const cream = '#fffdf8';
const palette = { '.': [0, 0, 0, 0], g: [23, 63, 50, 255],
  s: [245, 201, 91, 255], w: [255, 253, 248, 255], e: [174, 194, 177, 255] };
// Je ein Zeichen pro Pixel. Die gedeckte Kantenfarbe trennt Hundeohren vom Gesicht.
const faviconVariants = [
  { id: 'a', name: 'A: Runde Köpfe', rows: [
    '.....gggggg.....',
    '...gggggggggg...',
    '..gggggggggggg..',
    '.gggggssssggggg.',
    '.ggggssssssgggg.',
    'gggggssssssgwgwg',
    'gggggssssssgwgwg',
    'gggggsswsswgwgwg',
    'ggwwwggwwwwgwgwg',
    'ewwwwwewwwwgwwwg',
    'ewgwgwewgwgggwgg',
    'ewwwwwewwwwgwwwg',
    '.gwwwgggwwgggwg.',
    '..gggggggggggg..',
    '...gggggggggg...',
    '.....gggggg.....',
  ] },
  { id: 'b', name: 'B: Versetzte Gesichter', rows: [
    '.....gggggg.....',
    '...gggggggggg...',
    '..gggggggggggg..',
    '.gggggssssggggg.',
    '.ggggssssssgwgw.',
    'gggggsswsswgwgwg',
    'gggggsswwwwgwgwg',
    'gggggsswwwwwwgwg',
    'ggwwwsswgwgwwgwg',
    'ewwwwwewwwwwgwgg',
    'ewgwgwegwwwewwww',
    'ewwwwweggggegwgw',
    '.gwwwgggggggwww.',
    '..gggggggggggg..',
    '...gggggggggg...',
    '.....gggggg.....',
  ] },
  { id: 'c', name: 'C: Schnauzen und Ohrkanten', rows: [
    '.....gggggg.....',
    '...gggggggggg...',
    '..gggggggggggg..',
    '.gggggssssggggg.',
    '.ggggssssssgwgw.',
    'gggggsswsswgwgwg',
    'gggggsswwwwgwgwg',
    'gggggsswwwwwwgwg',
    'ggwwwsswgwgwwgwg',
    'ewwwwwewwgwwgwgg',
    'ewgwgwegwwwewwww',
    'ewwgwweggggegwgw',
    '.gwwwgggggggwgw.',
    '..gggggggggggg..',
    '...gggggggggg...',
    '.....gggggg.....',
  ] },
];
const selectedVariant = 'b';
const favicon16 = faviconVariants.find(variant => variant.id === selectedVariant).rows;
const svgOptions = {
  plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }],
};

function svg(title, viewBox, body) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox +
    '" role="img" aria-labelledby="title"><title id="title">' + title +
    '</title>' + body + '</svg>';
}

function saveSvg(filename, source) {
  const result = optimize(source, { ...svgOptions, path: filename });
  fs.writeFileSync(filename, result.data + '\n');
  return result.data;
}

function lettering(text, x, baseline, size, color, centered = false) {
  const outline = font.getPath(text, 0, 0, size, { kerning: true });
  const bounds = outline.getBoundingBox();
  const left = centered ? x - (bounds.x2 - bounds.x1) / 2 : x;
  return '<path fill="' + color + '" transform="translate(' +
    (left - bounds.x1).toFixed(3) + ' ' + baseline + ')" d="' + outline.toPathData(3) + '"/>';
}

function raster(source, width, background) {
  return new Resvg(source, { fitTo: { mode: 'width', value: width }, background }).render().asPng();
}

async function png(filename, source, width, background) {
  let image = sharp(raster(source, width, background));
  if (background) image = image.flatten({ background }).removeAlpha();
  const bytes = optimizePng(await image.png({ compressionLevel: 9 }).toBuffer());
  fs.writeFileSync(filename, bytes);
  return bytes;
}

function optimizePng(bytes) {
  const binary = process.env.OXIPNG || path.join(path.dirname(require.resolve('oxipng/package.json')),
    'bin/oxipng-4.0.3-x86_64-pc-windows-msvc/oxipng.exe');
  return execFileSync(binary, ['-o', '4', '--strip', 'safe', '--stdout', '-'],
    { input: bytes, windowsHide: true, maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}

function pixelTemplate(rows) {
  if (rows.length !== 16 || rows.some(row => row.length !== 16)) throw new Error('Pixelraster muss 16×16 sein');
  return Buffer.from(rows.flatMap(row => [...row].flatMap(char => {
    if (!palette[char]) throw new Error('Unbekannte Pixelfarbe: ' + char);
    return palette[char];
  })));
}

async function faviconFrame(small, size) {
  const image = size === 16
    ? sharp(pixelTemplate(favicon16), { raw: { width: 16, height: 16, channels: 4 } })
    : sharp(raster(small, size));
  // 32 und 48 px direkt aus den Vektorpfaden, mit Augen, Nasen und Kantenglättung.
  return optimizePng(await image.png({ compressionLevel: 9 }).toBuffer());
}

function appIcon(master, size, inset) {
  const body = master.replace(/^<svg[^>]*><title[^>]*>[^<]*<\/title>/, '').replace(/<\/svg>$/, '');
  // Innenabstand zum farbigen Motiv (rund 1024 Einheiten breit), nicht zum grünen Kreis.
  const scale = size * (1 - 2 * inset) / 1024;
  return svg('Sonnenhof der Koboldtiere', '0 0 ' + size + ' ' + size,
    '<path fill="' + green + '" d="M0 0H' + size + 'V' + size + 'H0Z"/>' +
    '<g transform="translate(' + size / 2 + ' ' + size / 2 + ') scale(' + scale +
    ') translate(-627 -627)">' + body + '</g>');
}

async function buildFavicons(master, small, browserOnly = false) {
  fs.writeFileSync(path.join(root, 'favicon.svg'), small + '\n');
  const frames = [];
  for (const size of [16, 32, 48]) frames.push({ size, frame: await faviconFrame(small, size) });
  // ICO-Verzeichnis mit drei verlustfreien PNG-Bildern.
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, frame }, i) => {
    const entry = 6 + i * 16;
    header[entry] = size;
    header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  fs.writeFileSync(path.join(root, 'favicon.ico'), Buffer.concat([header, ...frames.map(f => f.frame)]));
  if (browserOnly) return;
  await png(path.join(root, 'apple-touch-icon.png'), appIcon(master, 180, .125), 180, green);
  for (const size of [192, 512]) await png(path.join(root, 'icon-' + size + '.png'), master, size);
  // Der Prüfer kontrolliert alle nichtgrünen Pixel gegen den mittleren 80-%-Kreis.
  await png(path.join(root, 'icon-512-maskable.png'), appIcon(master, 512, .125), 512, green);
  // ICO und SVG decken die Browsergrößen ab. Keine unreferenzierten PNG-Favicons.
  for (const size of [16, 32]) {
    const filename = path.join(root, 'favicon-' + size + '.png');
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
  }
}

async function main() {
  const masterFile = path.join(logoDir, 'sonnenhof-bildmarke.svg');
  const master = fs.readFileSync(masterFile, 'utf8').trim();
  // Eigenständige Browserquelle: kleine SVG aus f2065d7, ohne die Logo-Datei umzuschreiben.
  const small = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8').trim();
  const browserOnly = process.argv.includes('--favicons-only');
  await buildFavicons(master, small, browserOnly);
  if (browserOnly) {
    console.log('Nur Browser-Favicons erzeugt: ICO mit Pixelraster 16 px und SVG-Rendering 32/48 px.');
    return;
  }
  const fontBytes = fs.readFileSync(process.env.SONNENHOF_FONT || 'C:/Windows/Fonts/georgia.ttf');
  font = opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength));
  // Die eigene SVG-Hülle entfernen, damit alle Varianten echte Pfade enthalten.
  const artwork = master.replace(/^<svg[^>]*><title[^>]*>[^<]*<\/title>/, '').replace(/<\/svg>$/, '');
  const mark = '<g transform="scale(' + (400 / 1254) + ')">' + artwork + '</g>';
  const horizontal = (color) => svg('Sonnenhof der Koboldtiere', '0 0 1100 400', mark +
    lettering('Sonnenhof', 438, 190, 118, color) +
    lettering('der Koboldtiere', 438, 274, 64, color));
  const dark = saveSvg(path.join(logoDir, 'sonnenhof-logo-quer.svg'), horizontal(green));
  saveSvg(path.join(logoDir, 'sonnenhof-logo-quer-hell.svg'), horizontal(cream));
  saveSvg(path.join(logoDir, 'sonnenhof-logo-hoch.svg'),
    svg('Sonnenhof der Koboldtiere', '0 0 800 840',
      '<g transform="translate(125 20) scale(' + (550 / 1254) + ')">' + artwork + '</g>' +
      lettering('Sonnenhof', 400, 683, 116, green, true) +
      lettering('der Koboldtiere', 400, 765, 64, green, true)));
  for (const size of [512, 192, 96]) {
    await png(path.join(logoDir, 'sonnenhof-bildmarke-' + size + '.png'), master, size);
  }
  const horizontalBody = dark.replace(/^<svg[^>]*><title[^>]*>[^<]*<\/title>/, '').replace(/<\/svg>$/, '');
  const social = svg('Sonnenhof der Koboldtiere', '0 0 1200 630',
    '<path fill="' + cream + '" d="M0 0H1200V630H0Z"/>' +
    '<g transform="translate(75 124.091) scale(0.954545)">' + horizontalBody + '</g>');
  await png(path.join(logoDir, 'sonnenhof-social.png'), social, 1200);
  console.log('Logo-Set einschließlich vollständigem Favicon-Set erzeugt.');
}

module.exports = { favicon16, faviconVariants, selectedVariant, pixelTemplate, palette };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
