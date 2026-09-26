// Pre-renders the procedural art into assets/baked/ so phones start faster.
// Usage: python3 -m http.server 8080 (in the repo root), then: node tools/bake.mjs [http://localhost:8080]
// Needs Playwright (npm i -D playwright). Re-run after changing any art, and bump ART_VERSION in src/art/assets.js.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:8080';
const out = new URL('../assets/baked/', import.meta.url).pathname;
const iconsOut = new URL('../assets/icons/', import.meta.url).pathname;
mkdirSync(out, { recursive: true }); mkdirSync(iconsOut, { recursive: true });
for (const f of readdirSync(out)) unlinkSync(out + f);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/tools/bake.html`);
await page.waitForFunction(() => window.ready);
const { version, files, icons } = await page.evaluate(() => window.bake());
await browser.close();

const save = (dir, name, dataUrl) => writeFileSync(dir + name, Buffer.from(dataUrl.split(',')[1], 'base64'));
for (const f of files) save(out, f.file, f.data);
for (const i of icons) save(iconsOut, i.file, i.data);
const manifest = { version, files: files.map(({ data, ...rest }) => rest) };
writeFileSync(out + 'manifest.json', JSON.stringify(manifest));
console.log(`Baked ${files.length} files (art version ${version}) and ${icons.length} icons.`);
