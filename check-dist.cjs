const fs = require('fs');
const path = require('path');
const d = path.join(__dirname, 'dist');
const missing = [];

function check(rel) {
  const clean = String(rel).replace(/^\/+/, '');
  if (!fs.existsSync(path.join(d, clean))) missing.push(rel);
}

const manifest = JSON.parse(fs.readFileSync(path.join(d, 'manifest.json'), 'utf8'));
if (manifest.background?.service_worker) check(manifest.background.service_worker);
for (const cs of manifest.content_scripts || []) for (const js of cs.js || []) check(js);
if (manifest.side_panel?.default_path) check(manifest.side_panel.default_path);
if (manifest.options_page) check(manifest.options_page);
if (manifest.icons) Object.values(manifest.icons).forEach(check);
if (manifest.action?.default_icon) Object.values(manifest.action.default_icon).forEach(check);
for (const war of manifest.web_accessible_resources || [])
  for (const r of war.resources || []) if (!r.includes('*')) check(r);

for (const htmlPath of [manifest.side_panel?.default_path, manifest.options_page].filter(Boolean)) {
  const html = fs.readFileSync(path.join(d, htmlPath), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) check(ref);
  // verify every module import inside entry scripts
  for (const ref of refs.filter((r) => r.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(d, ref.replace(/^\/+/, '')), 'utf8');
    for (const imp of [...code.matchAll(/from\s*"(\.\/[^"]+)"/g)].map((m) => m[1]))
      check(path.join(path.dirname(ref), imp));
  }
}

const sw = fs.readFileSync(path.join(d, manifest.background.service_worker), 'utf8');
for (const m of sw.matchAll(/import\s+'([^']+)'/g)) check(m[1]);

console.log(missing.length ? 'MISSING:\n' + missing.join('\n') : 'ALL REFERENCES OK');
