const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const bin = (name) => join(__dirname, '..', 'node_modules', name);
const children = [];
let stopping = false;
function launch(executable, args, env = process.env) {
  const p = spawn(executable, args, { stdio: 'inherit', env, windowsHide: true });
  children.push(p);
  p.on('error', (e) => {
    console.error(e);
    stop(1);
  });
  return p;
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
const compile = launch(process.execPath, [bin('typescript/bin/tsc'), '-p', 'tsconfig.main.json']);
compile.on('exit', async (code) => {
  if (code !== 0) return stop(code || 1);
  const vite = launch(process.execPath, [
    bin('vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    '5371',
    '--strictPort',
  ]);
  vite.on('exit', (code) => stop(code || 0));
  const url = 'http://127.0.0.1:5371';
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) {
    console.error('Vite failed to start.');
    return stop(1);
  }
  const electron = require('electron');
  const env = { ...process.env, ISLAND_DEV_URL: url };
  delete env.ELECTRON_RUN_AS_NODE;
  launch(electron, ['.'], env).on('exit', (code) => stop(code || 0));
});
