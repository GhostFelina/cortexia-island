const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const version = require('../package.json').version;
const platform = process.argv[2],
  arch = process.argv[3];
if (!['win', 'mac'].includes(platform) || !['x64', 'arm64'].includes(arch))
  throw new Error('Invalid package platform');
const executable =
  platform === 'win'
    ? path.resolve('release/win-unpacked/Cortexia Island.exe')
    : path.resolve(
        `release/${arch === 'arm64' ? 'mac-arm64' : 'mac'}/Cortexia Island.app/Contents/MacOS/Cortexia Island`,
      );
if (!fs.existsSync(executable)) throw new Error('Packaged executable missing: ' + executable);
function smoke(appMode) {
  return new Promise((resolve, reject) => {
    const resultFile = path.resolve(
      '.artifacts/' + (appMode ? 'smoke-app-result.json' : 'smoke-result.json'),
    );
    if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);
    const child = spawn(executable, ['--smoke', ...(appMode ? ['--app-mode'] : [])], {
      cwd: process.cwd(),
      stdio: 'inherit',
      windowsHide: true,
    });
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Packaged smoke timed out'));
    }, 90000);
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('exit', (code) => {
      clearTimeout(timeout);
      try {
        if (code !== 0 || !fs.existsSync(resultFile)) throw new Error('Packaged app smoke failed');
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        if (!result.passed || result.version !== version)
          throw new Error('Packaged smoke result mismatch');
        console.log(
          `PACKAGED SMOKE PASS: ${platform}-${arch} ${version} ${appMode ? 'native-app' : 'island'}`,
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}
(async () => {
  await smoke(false);
  await smoke(true);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
