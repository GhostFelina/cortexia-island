const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const source = 'packages';
const dest = 'release';
fs.mkdirSync(dest, { recursive: true });
const manifests = new Map();
for (const folder of fs.readdirSync(source)) {
  const dir = path.join(source, folder);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (name.endsWith('.yml') && !/^(alpha|beta|latest)(-mac)?\.yml$/.test(name)) continue;
    if (/^(alpha|beta|latest)(-mac)?\.yml$/.test(name)) {
      const value = yaml.parse(fs.readFileSync(file, 'utf8'));
      if (typeof value.version !== 'string' || !Array.isArray(value.files) || !value.files.length)
        throw new Error('Invalid update manifest: ' + name);
      const old = manifests.get(name);
      if (old) {
        if (old.version !== value.version) throw new Error('Mismatched update versions');
        old.files = [...old.files, ...value.files];
      } else manifests.set(name, value);
    } else if (!name.startsWith('SHA256-')) {
      const target = path.join(dest, name);
      if (fs.existsSync(target)) throw new Error('Duplicate release artifact: ' + name);
      fs.copyFileSync(file, target);
    }
  }
}
for (const [name, value] of manifests) {
  const seen = new Set();
  value.files = value.files.filter((f) => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });
  if (name.includes('-mac')) {
    if (
      !value.files.some((f) => f.url.includes('arm64') && f.url.endsWith('.zip')) ||
      !value.files.some((f) => f.url.includes('x64') && f.url.endsWith('.zip'))
    )
      throw new Error('Both macOS architectures are required');
  }
  fs.writeFileSync(path.join(dest, name), yaml.stringify(value), 'utf8');
}
console.log('Merged architecture-specific packages and update manifests.');
