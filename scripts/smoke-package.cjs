const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const version = require('../package.json').version;
const platform = process.argv[2];
const arch = process.argv[3];
if (!['win', 'mac'].includes(platform) || !['x64', 'arm64'].includes(arch))
  throw new Error('Invalid package platform');
const executable =
  platform === 'win'
    ? path.resolve('release/win-unpacked/Cortexia Island.exe')
    : path.resolve(
        `release/${arch === 'arm64' ? 'mac-arm64' : 'mac'}/Cortexia Island.app/Contents/MacOS/Cortexia Island`,
      );
if (!fs.existsSync(executable)) throw new Error('Packaged executable missing: ' + executable);
const resultFile = path.resolve('.artifacts/smoke-result.json');
if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);
const child = spawn(executable, ['--smoke'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  windowsHide: true,
});
const timeout = setTimeout(() => {
  child.kill();
  console.error('Packaged smoke timed out');
  process.exitCode = 1;
}, 45000);
child.on('error', (error) => {
  clearTimeout(timeout);
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  clearTimeout(timeout);
  if (code !== 0 || !fs.existsSync(resultFile)) {
    process.exitCode = 1;
    return;
  }
  const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  if (!result.passed || result.version !== version) {
    console.error('Packaged smoke result mismatch');
    process.exitCode = 1;
    return;
  }
  console.log(`PACKAGED SMOKE PASS: ${platform}-${arch} ${version}`);
});
