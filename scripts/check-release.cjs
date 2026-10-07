const { version } = require('../package.json');
const fs = require('node:fs');
if (process.argv[2] !== `v${version}` || fs.readFileSync('VERSION', 'utf8').trim() !== version) {
  console.error('Tag, package.json and VERSION must match.');
  process.exit(1);
}
