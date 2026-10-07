const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const label = process.argv[2] || process.platform;
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid platform label');
const files = fs
  .readdirSync('release')
  .filter((n) => /\.(exe|dmg|zip|blockmap)$/.test(n) || /^(alpha|beta|latest)(-mac)?\.yml$/.test(n))
  .sort();
fs.writeFileSync(
  path.join('release', `SHA256-${label}.txt`),
  files
    .map(
      (file) =>
        `${createHash('sha256')
          .update(fs.readFileSync(path.join('release', file)))
          .digest('hex')}  ${file}`,
    )
    .join('\n') + '\n',
  'utf8',
);
