// Downloads the licensed car photographs from Wikimedia Commons, crops and resizes them to WebP <= 80 KB,
// and writes build/data/photos.json with author, license and source page for the credits on /sources/.
// Run once with: node build/photos.mjs (outputs are committed; the site build does not need the network).
import fs from 'node:fs';
import sharp from 'sharp';
import { r } from './lib.mjs';

const info = JSON.parse(fs.readFileSync(r('build/data/photo-candidates.json'), 'utf8'));
// crop: [left, top, width, height] as fractions of the original; w: output width
export const PHOTOS = [
  { slug: 'hero-audi-e-tron', id: 9111586, crop: [0.02, 0.2, 0.96, 0.74], w: 1400, alt: 'Red Audi e-tron concept car on a dark exhibition stand', subject: 'Audi e-tron concept', author: 'Thomas Wolf (foto-tw.de), retouched by LiveChocolate' },
  { slug: 'porsche-911', id: 29171275, crop: [0, 0.12, 1, 0.78], w: 1400, alt: 'Grey Porsche 911 Carrera 4S on a racing circuit', subject: 'Porsche 911 Carrera 4S' },
  { slug: 'mini-engine-bay', id: 60520015, crop: [0, 0.06, 1, 0.84], w: 1200, alt: 'Engine bay of a classic Mini with a red 1275 cc engine', subject: 'Mini 1275 cc engine bay' },
  { slug: 'audi-sport-quattro', id: 28984473, crop: [0, 0.36, 0.84, 0.64], w: 1400, alt: 'Yellow Audi Sport quattro concept car at a motor show', subject: 'Audi Sport quattro concept', author: 'Thomas Wolf (foto-tw.de)' },
  { slug: 'wolseley-engine', id: 50852111, crop: [0, 0.08, 1, 0.8], w: 1200, alt: 'Engine compartment of a 1959 Wolseley 1500', subject: 'Wolseley 1500 engine compartment' },
  { slug: 'volvo-pv544', id: 107537254, crop: [0.08, 0.3, 0.84, 0.62], w: 1000, alt: 'Black Volvo PV 544 parked at sunset', subject: 'Volvo PV 544' },
  { slug: 'porsche-wheel', id: 68367279, crop: [0, 0.05, 1, 0.9], w: 1200, alt: 'Wheel and brake of a Porsche Mission E concept car', subject: 'Porsche Mission E wheel' },
  { slug: 'mercedes-w115', id: 40633268, crop: [0, 0.14, 1, 0.8], w: 1200, alt: 'White Mercedes-Benz W115 220D saloon from 1973', subject: 'Mercedes-Benz W115 220D' },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  fs.mkdirSync(r('images/photos'), { recursive: true });
  const out = {};
  for (const p of PHOTOS) {
    const meta = info[p.id];
    if (!meta) throw new Error(`no license data for ${p.id}`);
    if (!/^CC BY(-SA)? [0-9.]+|^CC0|^Public domain/i.test(meta.lic)) throw new Error(`license not accepted: ${meta.lic}`);
    const src = meta.thumb.replace(/\/\d+px-/, '/1920px-');
    const res = await fetch(src, { headers: { 'User-Agent': 'static-site-builder/1.0' } });
    if (!res.ok) throw new Error(`${p.slug}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const img = sharp(buf);
    const { width, height } = await img.metadata();
    const [l, t, w, h] = p.crop;
    const region = { left: Math.round(l * width), top: Math.round(t * height), width: Math.round(w * width), height: Math.round(h * height) };
    let q = 72, file;
    do {
      file = await sharp(buf).extract(region).resize(p.w).webp({ quality: q, effort: 6 }).toBuffer();
      q -= 4;
    } while (file.length > 80 * 1024 && q > 30);
    fs.writeFileSync(r('images/photos', `${p.slug}.webp`), file);
    const m = await sharp(file).metadata();
    out[p.slug] = { file: `images/photos/${p.slug}.webp`, width: m.width, height: m.height, alt: p.alt, subject: p.subject, author: p.author || meta.artist.replace(/\s+/g, ' ').trim(), license: meta.lic, licenseUrl: meta.licUrl, source: meta.page };
    console.log(p.slug, `${m.width}x${m.height}`, `${(file.length / 1024).toFixed(1)} KB`, meta.lic);
  }
  fs.writeFileSync(r('build/data/photos.json'), JSON.stringify(out, null, 2) + '\n');
  // Flags (flag-icons, MIT): copied as files, referenced by <img>.
  fs.mkdirSync(r('images/flags'), { recursive: true });
  for (const c of ['us', 'gb', 'ca', 'au', 'il']) fs.copyFileSync(r('node_modules/flag-icons/flags/4x3', `${c}.svg`), r('images/flags', `${c}.svg`));
  fs.copyFileSync(r('node_modules/flag-icons/LICENSE'), r('images/flags/LICENSE.txt'));
}
