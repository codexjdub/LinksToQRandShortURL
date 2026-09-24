import { readFile, mkdir, writeFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const worker = await readFile(new URL('../src/worker.mjs', import.meta.url), 'utf8');
await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/server/index.js', import.meta.url), worker.replace('/* HTML */', () => 'const HTML = ' + JSON.stringify(html) + ';'));
console.log('Built the site worker from index.html.');
