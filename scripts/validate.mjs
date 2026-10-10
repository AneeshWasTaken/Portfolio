// Checks content/projects.json for mistakes. Run with: npm run check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function validateProjects(root = ROOT) {
  const errors = [];
  const warnings = [];
  const file = path.join(root, 'content', 'projects.json');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { errors: [`content/projects.json is not valid JSON: ${e.message}`], warnings, data: null };
  }

  const cats = Array.isArray(data.categories) ? data.categories : [];
  if (!cats.length) errors.push('"categories" must be a non-empty list.');
  const catIds = new Set();
  for (const c of cats) {
    if (!c || typeof c.id !== 'string' || !c.id || typeof c.label !== 'string' || !c.label) {
      errors.push(`Every category needs an "id" and a "label": ${JSON.stringify(c)}`);
      continue;
    }
    if (c.id === 'all') errors.push('Category id "all" is reserved.');
    if (catIds.has(c.id)) errors.push(`Duplicate category id "${c.id}".`);
    catIds.add(c.id);
  }

  const projects = Array.isArray(data.projects) ? data.projects : null;
  if (!projects) errors.push('"projects" must be a list.');
  const ids = new Set();
  const isRemote = (v) => /^https?:\/\//i.test(v);

  (projects || []).forEach((p, i) => {
    const label = `Project #${i + 1}${p && p.title ? ` ("${p.title}")` : ''}`;
    if (!p || typeof p !== 'object') return errors.push(`${label} is not an object.`);
    if (typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(p.id)) errors.push(`${label}: "id" must be lowercase letters, numbers and dashes.`);
    else if (ids.has(p.id)) errors.push(`${label}: duplicate id "${p.id}".`);
    else ids.add(p.id);
    if (typeof p.title !== 'string' || !p.title.trim()) errors.push(`${label}: "title" is required.`);
    if (!catIds.has(p.category)) errors.push(`${label}: category "${p.category}" is not one of: ${[...catIds].join(', ')}.`);
    if (p.description !== undefined && typeof p.description !== 'string') errors.push(`${label}: "description" must be text.`);
    if (p.software !== undefined && !(Array.isArray(p.software) && p.software.every((s) => typeof s === 'string'))) errors.push(`${label}: "software" must be a list of names, e.g. ["DaVinci Resolve"].`);
    if (p.aspect !== undefined && !/^\d{1,3}:\d{1,3}$/.test(p.aspect)) errors.push(`${label}: "aspect" must look like "16:9" or "9:16".`);
    for (const key of ['thumbnail', 'preview', 'video']) {
      const v = p[key];
      if (v === undefined || v === '') continue;
      if (typeof v !== 'string') { errors.push(`${label}: "${key}" must be text.`); continue; }
      if (isRemote(v)) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(v)) { errors.push(`${label}: "${key}" has an unsupported link type.`); continue; }
      if (!fs.existsSync(path.join(root, v))) errors.push(`${label}: "${key}" points to "${v}", but that file does not exist.`);
    }
    if (!p.placeholder && !p.video) warnings.push(`${label} has no "video" link, so its card will not be playable.`);
    if (!p.placeholder && !p.thumbnail && !(typeof p.video === 'string' && /youtu/.test(p.video))) warnings.push(`${label} has no thumbnail, so a generated placeholder image is shown.`);
  });

  return { errors, warnings, data };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings, data } = validateProjects();
  warnings.forEach((w) => console.log('  note:', w));
  if (errors.length) {
    errors.forEach((e) => console.error('  ERROR:', e));
    console.error(`\nFound ${errors.length} problem(s) in content/projects.json.`);
    process.exit(1);
  }
  const n = data.projects.length;
  const ph = data.projects.filter((p) => p.placeholder).length;
  console.log(`projects.json is valid: ${n} project(s)${ph ? `, ${ph} placeholder(s)` : ''}.`);
}
