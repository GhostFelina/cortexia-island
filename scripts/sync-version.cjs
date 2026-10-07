const fs = require('node:fs');
const { version } = require('../package.json');
fs.writeFileSync('VERSION', version + '\n', 'utf8');
