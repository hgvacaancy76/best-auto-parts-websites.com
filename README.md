# Best Auto Parts Websites

Static reference site that compares online stores selling new OEM and aftermarket car parts by delivery countries, returns, payment and import duties.

Plain HTML and CSS. No JavaScript, no external requests.

## Build

```bash
npm install        # development tools only (Markdown parser, Puppeteer, image tools)
bash build.sh      # builds every page, sitemap.xml and robots.txt
node serve.mjs     # http://localhost:3000/
```

`node serve.mjs --base /REPO-NAME/` serves the site under a sub-path, the way GitHub Pages serves a project site. `--port` changes the port.

## Layout

- `content/*.html` holds the inner markup of each page, `build/data/stores.json` holds the store data. Tables, cards, the coverage matrix and structured data are generated from that one file.
- `components/` holds the header and footer, `css/` the styles, `build/` the build scripts.
- `node build/check.mjs` runs the pre-release checks; `--net` also requests external links.
- `node build/check-browser.mjs` loads every page in a headless browser at 320 and 1440 px, from the root and from a sub-path, with JavaScript disabled.

## Licenses

Icons: [Lucide](https://lucide.dev/license), ISC License. Display typeface: Archivo, SIL Open Font License 1.1 (`fonts/OFL.txt`).
