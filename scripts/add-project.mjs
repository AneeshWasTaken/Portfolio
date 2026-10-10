// Adds a project to content/projects.json by asking you questions. Run with: npm run add-project
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { validateProjects } from './validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'content', 'projects.json');

const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(question, fallback = '') {
  process.stdout.write(question + (fallback ? ` [${fallback}]` : '') + ': ');
  const { value, done } = await lines.next();
  const answer = (done ? '' : String(value)).trim();
  if (done) process.stdout.write('\n');
  return answer || fallback;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'project';

const before = validateProjects();
if (before.errors.length) {
  console.error('content/projects.json has problems. Fix them first (npm run check):');
  before.errors.forEach((e) => console.error('  -', e));
  process.exit(1);
}
const data = before.data;

console.log('\nAdd a new project. Press Enter to skip optional questions.\n');
const title = await ask('Title');
if (!title) { console.error('A title is required.'); process.exit(1); }

console.log('\nCategories:');
data.categories.forEach((c, i) => console.log(`  ${i + 1}. ${c.label}`));
let cat = null;
while (!cat) {
  const a = await ask('Choose a category number', '1');
  const idx = parseInt(a, 10) - 1;
  cat = data.categories[idx] || data.categories.find((c) => c.id === a);
  if (!cat) console.log('  Please type one of the numbers above.');
  if (!cat && a === '') break;
}
if (!cat) { console.error('A category is required.'); process.exit(1); }

const description = await ask('Short description');
const software = (await ask('Software used, separated by commas (optional)'))
  .split(',').map((s) => s.trim()).filter(Boolean);
const video = await ask('Video link (YouTube/Vimeo/Drive link, or a path like assets/videos/my-edit.mp4)');
const thumbnail = await ask('Thumbnail path (e.g. assets/thumbs/my-edit.jpg), blank = auto for YouTube');
const preview = await ask('Hover preview clip path (optional, e.g. assets/previews/my-edit.mp4)');
const aspect = await ask('Video shape: 16:9 (landscape) or 9:16 (vertical)', '16:9');

let id = slug(title);
const taken = new Set(data.projects.map((p) => p.id));
for (let n = 2; taken.has(id); n++) id = `${slug(title)}-${n}`;

const project = { id, title, category: cat.id, description, software, aspect, thumbnail, preview, video };
data.projects.unshift(project); // newest first

const removable = data.projects.filter((p) => p.placeholder).length;
if (removable) {
  const r = (await ask(`\nRemove the ${removable} placeholder card(s) now? (y/N)`, 'n')).toLowerCase();
  if (r.startsWith('y')) data.projects = data.projects.filter((p) => !p.placeholder);
}
rl.close();

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
const after = validateProjects();
console.log(`\nAdded "${title}" (id: ${id}).`);
after.warnings.forEach((w) => console.log('  note:', w));
after.errors.forEach((e) => console.log('  ERROR:', e));
if (after.errors.length) console.log('Some files you mentioned were not found. Add them to the assets folder, or fix the paths in content/projects.json.');
console.log('Preview it with: npm run dev. When happy, push your changes to GitHub to publish.');
