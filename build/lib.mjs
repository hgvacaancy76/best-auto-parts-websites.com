// Shared helpers: paths, icons, markdown, escaping, dates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const r = (...p) => path.join(ROOT, ...p);

export class BuildError extends Error {}
export const fail = (msg) => { throw new BuildError(msg); };

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- icons (Lucide, ISC) ----------
// Pages reference icons with <use>; assemble.mjs injects one <symbol> per used icon.
const iconCache = new Map();
function iconInner(name) {
  if (!iconCache.has(name)) {
    const file = r('node_modules/lucide-static/icons', `${name}.svg`);
    if (!fs.existsSync(file)) fail(`Icon "${name}" not found in lucide-static`);
    const svg = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/\n\s*/g, '').trim();
    iconCache.set(name, inner);
  }
  return iconCache.get(name);
}
export function icon(name, cls = 'icon') {
  iconInner(name);
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
export function sprite(html) {
  const names = [...new Set([...html.matchAll(/<use href="#i-([a-z0-9-]+)"/g)].map((m) => m[1]))];
  return `<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>${names.map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconInner(n)}</symbol>`).join('')}</defs></svg>`;
}

// ---------- dates ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const today = new Date();
export const isoDate = (d = today) => d.toISOString().slice(0, 10);
export const monthYear = (d = today) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const fmtDay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
};
export const monthYearOf = (iso) => { const [y, m] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

// ---------- markdown ----------
export function parseMd(raw, file) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) fail(`${file}: front matter missing`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z0-9_]+):\s*"?(.*?)"?\s*$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  for (const k of ['title', 'meta_description', 'h1', 'date_published']) if (!fm[k]) fail(`${file}: front matter field "${k}" missing`);
  const body = raw.slice(m[0].length);
  const parts = body.split(/<!-- block: ([a-z0-9-]+) -->/);
  const blocks = new Map();
  for (let i = 1; i < parts.length; i += 2) blocks.set(parts[i], parts[i + 1].trim());
  return { fm, blocks };
}

// Inline markdown -> HTML with site link rules.
export function inline(md) {
  return linkRules(marked.parseInline(autolinkEmail(md)));
}
export function autolinkEmail(md) {
  return md.replace(/(^|[^\[(:\w])(editors@best-auto-parts-websites\.com)(?![\])\w])/g, '$1[$2](mailto:$2)');
}
export function linkRules(html) {
  return html.replace(/<a href="([^"]+)"([^>]*)>/g, (all, href, rest) => {
    if (href.startsWith('/')) return `<a href="{{root}}${href.slice(1)}"${rest}>`;
    if (/^https?:/.test(href)) return `<a href="${href}" target="_blank" rel="noopener">`;
    return `<a href="${href}"${rest}>`;
  });
}

export const tokens = (md) => marked.lexer(autolinkEmail(md));
export const sentences = (text) => text.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"])/);
export const wordCount = (text) => (text.match(/[A-Za-z0-9][A-Za-z0-9'’.,$£%&/+-]*/g) || []).length;
export const stripTags = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<\/?(a|strong|em|b|i|span|abbr|code|small)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
