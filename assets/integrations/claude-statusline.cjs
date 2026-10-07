// Claude Code's documented status-line input. Store only usage windows, never session content.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const destination = process.argv[2];
let text = '';
process.stdin.on('data', chunk => { text += chunk; if (text.length > 1048576) process.exit(0); });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(text);
    const read = key => {
      const w = data.rate_limits?.[key];
      if (typeof w?.used_percentage !== 'number' || !Number.isFinite(w.used_percentage) || w.used_percentage < 0 || w.used_percentage > 100 || typeof w.resets_at !== 'number' || !Number.isFinite(w.resets_at) || w.resets_at * 1000 <= Date.now()) return null;
      return { used_percentage: w.used_percentage, resets_at: w.resets_at };
    };
    const windows = { five_hour: read('five_hour'), seven_day: read('seven_day') };
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    const temporary = destination + '.tmp-' + process.pid;
    fs.writeFileSync(temporary, JSON.stringify({ receivedAt: Date.now(), rate_limits: windows }), { mode: 0o600 });
    fs.renameSync(temporary, destination);
    const stateFile = path.join(path.dirname(destination), 'claude-bridge-state.json');
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const previous = state.previousStatusLine;
    if (previous?.type === 'command' && typeof previous.command === 'string') {
      const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
      const shell = state.shell || (process.platform === 'win32' ? 'powershell.exe' : '/bin/sh');
      const args = shell.toLowerCase().includes('powershell') ? ['-NoProfile', '-Command', previous.command] : ['-c', previous.command];
      const result = spawnSync(shell, args, { input: text, encoding: 'utf8', windowsHide: true, timeout: 1500, maxBuffer: 65536, env });
      if (result.stdout) process.stdout.write(result.stdout);
    } else {
      const parts = [];
      if (windows.five_hour) parts.push(`5h ${Math.round(windows.five_hour.used_percentage)}%`);
      if (windows.seven_day) parts.push(`7d ${Math.round(windows.seven_day.used_percentage)}%`);
      process.stdout.write(parts.length ? 'Cortexia · ' + parts.join(' · ') : 'Cortexia · usage pending');
    }
  } catch { process.stdout.write('Cortexia · usage unavailable'); }
});
