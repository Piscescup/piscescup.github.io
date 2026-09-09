import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));

// Both the local server and production build expose the same public files.
export async function publicFiles() {
  const files = ['index.html', '404.html', '.nojekyll'];
  async function collect(directory, allowed) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await collect(relative, allowed);
      else if (entry.isFile() && allowed.has(path.extname(entry.name))) files.push(relative);
    }
  }
  await collect('projects', new Set(['.html']));
  await collect('categories', new Set(['.html']));
  await collect('tags', new Set(['.html']));
  await collect('javadoc', new Set(['.html']));
  await collect('downloads', new Set(['.html']));
  await collect('css', new Set(['.css']));
  await collect('js', new Set(['.js']));
  await collect('assets', new Set(['.svg', '.jpg', '.jpeg', '.png', '.webp', '.woff', '.woff2']));
  return files.sort();
}
