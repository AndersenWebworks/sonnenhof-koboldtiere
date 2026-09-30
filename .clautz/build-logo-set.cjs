const fs = require('node:fs');
const path = require('node:path');
const opentype = require('opentype.js');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const { optimize } = require('svgo');

const root = path.resolve(__dirname, '..');
const logoDir = path.join(root, 'assets/img/logo');
const fontBytes = fs.readFileSync(process.env.SONNENHOF_FONT || 'C:/Windows/Fonts/georgia.ttf');
const font = opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength));
const green = '#173f32';
const cream = '#fffdf8';
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
  const bytes = await sharp(raster(source, width, background)).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(filename, bytes);
  return bytes;
}

async function main() {
  const masterFile = path.join(logoDir, 'sonnenhof-bildmarke.svg');
  const smallFile = path.join(logoDir, 'sonnenhof-bildmarke-klein.svg');
  const master = saveSvg(masterFile, fs.readFileSync(masterFile, 'utf8'));
  const small = saveSvg(smallFile, fs.readFileSync(smallFile, 'utf8'));
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
  fs.writeFileSync(path.join(root, 'favicon.svg'), small + '\n');
  for (const size of [512, 192, 96]) {
    await png(path.join(logoDir, 'sonnenhof-bildmarke-' + size + '.png'), master, size);
  }
  const frames = [];
  for (const size of [16, 32, 48]) {
    const frame = await sharp(raster(small, size)).png({ compressionLevel: 9 }).toBuffer();
    frames.push({ size, frame });
    if (size !== 48) fs.writeFileSync(path.join(root, 'favicon-' + size + '.png'), frame);
  }
  // ICO-Verzeichnis mit drei verlustfreien PNG-Bildern, jeweils 32-Bit-RGBA.
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
  await png(path.join(root, 'apple-touch-icon.png'), master, 180, green);
  const horizontalBody = dark.replace(/^<svg[^>]*><title[^>]*>[^<]*<\/title>/, '').replace(/<\/svg>$/, '');
  const social = svg('Sonnenhof der Koboldtiere', '0 0 1200 630',
    '<path fill="' + cream + '" d="M0 0H1200V630H0Z"/>' +
    '<g transform="translate(75 124.091) scale(0.954545)">' + horizontalBody + '</g>');
  await png(path.join(logoDir, 'sonnenhof-social.png'), social, 1200);
  console.log('Logo-Set erzeugt: 6 SVGs, 7 PNGs, ICO mit 16/32/48 px.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
