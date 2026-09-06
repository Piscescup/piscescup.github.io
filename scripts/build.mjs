import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
for (const entry of ['index.html', 'styles.css', 'script.js', 'assets']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
const html = await readFile(path.join(output, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g)) {
  await readFile(path.join(output, match[1]));
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built static website in dist. Local assets verified.');
