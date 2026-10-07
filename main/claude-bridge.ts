import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
function quotePs(value: string) {
  return "'" + value.replace(/'/g, "''") + "'";
}
function quoteSh(value: string) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}
function atomic(file: string, data: unknown) {
  const temp = file + '.cortexia-tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}
export function installClaudeBridge(
  directory: string,
  asset: string,
  executable: string,
  home = os.homedir(),
): boolean {
  const file = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (typeof settings !== 'object' || !settings || Array.isArray(settings))
    throw new Error('Invalid Claude settings');
  const stateFile = path.join(directory, 'claude-bridge-state.json');
  const oldState = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
  const previousStatusLine =
    settings.statusLine?.command === oldState?.command
      ? oldState.previousStatusLine
      : (settings.statusLine ?? null);
  if (
    previousStatusLine &&
    (previousStatusLine.type !== 'command' || typeof previousStatusLine.command !== 'string')
  )
    throw new Error('Unsupported status line');
  const helper = path.join(directory, 'claude-statusline.cjs');
  fs.copyFileSync(asset, helper);
  const destination = path.join(directory, 'claude-limits.json');
  let command: string;
  if (process.platform === 'win32') {
    const psFile = path.join(directory, 'claude-statusline.ps1');
    const script = `$cortexiaInput = [Console]::In.ReadToEnd()\n$env:ELECTRON_RUN_AS_NODE = '1'\n$cortexiaInput | & ${quotePs(executable)} ${quotePs(helper)} ${quotePs(destination)}\n`;
    fs.writeFileSync(psFile, script, { mode: 0o600 });
    command =
      'powershell -NoLogo -NoProfile -NonInteractive -EncodedCommand ' +
      Buffer.from(script, 'utf16le').toString('base64');
  } else
    command = `ELECTRON_RUN_AS_NODE=1 ${quoteSh(executable)} ${quoteSh(helper)} ${quoteSh(destination)}`;
  const gitBash =
    process.platform === 'win32'
      ? ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe'].find((p) =>
          fs.existsSync(p),
        )
      : undefined;
  atomic(stateFile, {
    command,
    previousStatusLine,
    shell: gitBash ?? (process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'),
  });
  if (fs.existsSync(file))
    fs.copyFileSync(file, path.join(directory, `claude-settings-backup-${Date.now()}.json`));
  const backups = fs
    .readdirSync(directory)
    .filter((f) => /^claude-settings-backup-\d+\.json$/.test(f))
    .sort();
  for (const backup of backups.slice(0, -5)) fs.unlinkSync(path.join(directory, backup));
  settings.statusLine = { ...previousStatusLine, type: 'command', command, refreshInterval: 15 };
  atomic(file, settings);
  return true;
}
export function removeClaudeBridge(directory: string, home = os.homedir()): boolean {
  const file = path.join(home, '.claude', 'settings.json'),
    stateFile = path.join(directory, 'claude-bridge-state.json');
  if (!fs.existsSync(file) || !fs.existsSync(stateFile)) return false;
  const settings = JSON.parse(fs.readFileSync(file, 'utf8')),
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (settings.statusLine?.command !== state.command) return false;
  if (state.previousStatusLine) settings.statusLine = state.previousStatusLine;
  else delete settings.statusLine;
  atomic(file, settings);
  return true;
}
