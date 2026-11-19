// Generates favicon.svg, favicon.ico, apple-touch-icon.png and images/og-default.png.
// Run once with: node build/assets.mjs (outputs are committed; the site build does not need it).
import fs from 'node:fs';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { r } from './lib.mjs';

const mark = (bg, bar) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="${bg}"/><rect x="7" y="17" width="4.6" height="8" rx="1.6" fill="${bar}"/><rect x="13.7" y="12" width="4.6" height="13" rx="1.6" fill="${bar}"/><rect x="20.4" y="7" width="4.6" height="18" rx="1.6" fill="${bar}"/></svg>`;
const svg = mark('#0b1011', '#d4fa5a');
fs.writeFileSync(r('favicon.svg'), svg + '\n');

// ICO with embedded PNG images (16, 32, 48).
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(Buffer.from(svg)).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length; return e;
});
fs.writeFileSync(r('favicon.ico'), Buffer.concat([header, ...dir, ...pngs]));

// Apple touch icon: full-bleed square, iOS rounds the corners itself.
const touch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0b1011"/><rect x="7" y="17" width="4.6" height="8" rx="1.6" fill="#d4fa5a"/><rect x="13.7" y="12" width="4.6" height="13" rx="1.6" fill="#d4fa5a"/><rect x="20.4" y="7" width="4.6" height="18" rx="1.6" fill="#d4fa5a"/></svg>`;
await sharp(Buffer.from(touch)).resize(180, 180).png().toFile(r('apple-touch-icon.png'));

// OG image: site name on a neutral dark field, no store elements.
const font = fs.readFileSync(r('fonts/archivo-wdth.woff2')).toString('base64');
const html = `<!doctype html><html><head><style>
@font-face{font-family:A;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-stretch:62% 125%}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#93a3a2;padding:28px;font-family:A}
.p{position:relative;width:100%;height:100%;border-radius:40px;overflow:hidden;color:#fff;padding:72px 80px;
background:radial-gradient(circle 360px at 88% 50%,transparent 55%,#121919 72%),repeating-radial-gradient(circle at 88% 50%,rgba(255,255,255,.07) 0 1px,transparent 1px 26px),#121919}
.p:after{content:"";position:absolute;left:4%;right:4%;bottom:0;height:16px;background:linear-gradient(90deg,#d4fa5a,#a3cc3a 55%,#d4fa5a)}
svg{width:96px;height:96px}
h1{margin-top:56px;font-weight:900;font-stretch:125%;text-transform:uppercase;font-size:92px;line-height:.95;letter-spacing:-.01em}
h1 span{color:#d4fa5a;display:block}
</style></head><body><div class="p">${mark('#d4fa5a', '#0b1011')}<h1><span>Best Auto Parts</span>Websites</h1></div></body></html>`;
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: 'png' });
await browser.close();
await sharp(shot).png({ compressionLevel: 9, palette: true }).toFile(r('images/og-default.png'));
for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'images/og-default.png']) console.log(f, fs.statSync(r(f)).size, 'bytes');
