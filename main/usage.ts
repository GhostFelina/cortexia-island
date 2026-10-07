import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { UsageSample, UsageWindow } from '../shared/types';

export function emptyUsage(source: UsageSample['source']): UsageSample {
  return { status: 'unavailable', checkedAt: null, fiveHour: null, weekly: null, source };
}
function windowValue(
  percent: unknown,
  reset: unknown,
  minutes: number,
  now: number,
): UsageWindow | null {
  if (
    typeof percent !== 'number' ||
    !Number.isFinite(percent) ||
    percent < 0 ||
    percent > 100 ||
    typeof reset !== 'number' ||
    !Number.isFinite(reset) ||
    reset * 1000 <= now ||
    reset * 1000 > now + 32 * 86400000
  )
    return null;
  return { usedPercent: percent, resetsAt: reset * 1000, windowMinutes: minutes };
}
export function parseCodexUsage(input: unknown, now = Date.now()): UsageSample {
  const data = input as { rateLimitsByLimitId?: Record<string, any>; rateLimits?: any };
  const bucket =
    data?.rateLimitsByLimitId?.codex ??
    (data?.rateLimits?.limitId === 'codex' || !data?.rateLimits?.limitId
      ? data?.rateLimits
      : undefined);
  const windows = [bucket?.primary, bucket?.secondary];
  const read = (minutes: number) => {
    const w = windows.find((w) => w?.windowDurationMins === minutes);
    return windowValue(w?.usedPercent, w?.resetsAt, minutes, now);
  };
  const fiveHour = read(300),
    weekly = read(10080);
  return {
    source: 'codex-app-server',
    status: fiveHour || weekly ? 'ready' : 'unavailable',
    checkedAt: now,
    fiveHour,
    weekly,
  };
}
export function parseClaudeUsage(input: unknown, now = Date.now()): UsageSample {
  const data = input as {
    receivedAt?: unknown;
    rate_limits?: { five_hour?: any; seven_day?: any };
  };
  const receivedAt =
    typeof data?.receivedAt === 'number' &&
    Number.isFinite(data.receivedAt) &&
    data.receivedAt <= now + 10000
      ? data.receivedAt
      : null;
  const read = (key: 'five_hour' | 'seven_day', minutes: number) =>
    windowValue(
      data?.rate_limits?.[key]?.used_percentage,
      data?.rate_limits?.[key]?.resets_at,
      minutes,
      now,
    );
  const fiveHour = read('five_hour', 300),
    weekly = read('seven_day', 10080);
  return {
    source: 'claude-statusline',
    checkedAt: receivedAt,
    fiveHour,
    weekly,
    status:
      !receivedAt || (!fiveHour && !weekly)
        ? 'unavailable'
        : now - receivedAt > 120000
          ? 'stale'
          : 'ready',
  };
}
export function locateCodex(): string | null {
  const name = process.platform === 'win32' ? 'codex.exe' : 'codex';
  const paths = (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter((dir) => path.isAbsolute(dir))
    .map((dir) => path.join(dir, name));
  if (process.platform === 'win32') {
    const npmRoot = path.join(
      process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'),
      'npm',
      'node_modules',
      '@openai',
      'codex',
    );
    const vendor = path.join(
      npmRoot,
      'node_modules',
      '@openai',
      `codex-win32-${process.arch}`,
      'vendor',
      process.arch === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc',
    );
    paths.unshift(path.join(vendor, 'bin', name), path.join(vendor, 'codex', name));
  }
  paths.push(
    path.join(os.homedir(), '.local', 'bin', name),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
  );
  return (
    paths.find((file) => {
      try {
        return fs.statSync(file).isFile() && !file.endsWith('.cmd');
      } catch {
        return false;
      }
    }) ?? null
  );
}
export class UsageProvider {
  codex = emptyUsage('codex-app-server');
  claude = emptyUsage('claude-statusline');
  private process: ChildProcessWithoutNullStreams | null = null;
  private initialized = false;
  private buffer = '';
  private pending: number | null = null;
  private sequence = 1;
  private lastRequest = 0;
  private timeout: NodeJS.Timeout | null = null;
  constructor(
    private directory: string,
    private changed: () => void,
  ) {}
  private send(method: string, id?: number, params?: unknown) {
    this.process?.stdin.write(
      JSON.stringify({
        method,
        ...(id !== undefined ? { id } : {}),
        ...(params !== undefined ? { params } : {}),
      }) + '\n',
    );
  }
  private fail() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    this.pending = null;
    this.codex = { ...this.codex, status: this.codex.checkedAt ? 'stale' : 'unavailable' };
    this.changed();
  }
  private read() {
    if (!this.initialized || this.pending !== null) return;
    this.pending = ++this.sequence;
    this.lastRequest = Date.now();
    this.send('account/rateLimits/read', this.pending);
    this.timeout = setTimeout(() => {
      this.fail();
      this.process?.kill();
    }, 15000);
  }
  private start() {
    const executable = locateCodex();
    if (!executable) {
      this.lastRequest = Date.now();
      this.codex = emptyUsage('codex-app-server');
      return;
    }
    const proc = spawn(executable, ['app-server', '--listen', 'stdio://'], {
      cwd: this.directory,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process = proc;
    this.initialized = false;
    this.buffer = '';
    this.lastRequest = Date.now();
    this.codex = { ...this.codex, status: this.codex.checkedAt ? 'stale' : 'checking' };
    proc.stderr.on('data', () => {}); // Never forward auth diagnostics into renderer/logs.
    proc.stdin.on('error', () => this.fail());
    proc.on('error', () => this.fail());
    proc.on('exit', () => {
      if (this.process === proc) {
        this.process = null;
        this.initialized = false;
        this.fail();
      }
    });
    proc.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      if (this.buffer.length > 1048576) {
        this.fail();
        proc.kill();
        return;
      }
      let end;
      while ((end = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + 1);
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id === 1) {
          if (this.timeout) clearTimeout(this.timeout);
          this.timeout = null;
          if (msg.error) {
            this.fail();
            proc.kill();
            return;
          }
          this.initialized = true;
          this.send('initialized', undefined, {});
          this.read();
        } else if (msg.id === this.pending) {
          if (this.timeout) clearTimeout(this.timeout);
          this.timeout = null;
          this.pending = null;
          if (msg.error) this.fail();
          else {
            this.codex = parseCodexUsage(msg.result);
            this.changed();
          }
        } else if (msg.method === 'account/rateLimits/updated') {
          this.codex = parseCodexUsage(msg.params);
          this.changed();
        } else if (msg.id !== undefined && msg.method) {
          proc.stdin.write(
            JSON.stringify({
              id: msg.id,
              error: { code: -32601, message: 'Read-only usage monitor' },
            }) + '\n',
          );
        }
      }
    });
    this.timeout = setTimeout(() => {
      this.fail();
      proc.kill();
    }, 15000);
    this.send('initialize', 1, {
      clientInfo: {
        name: 'cortexia_island',
        title: 'Cortexia Island',
        version: require('../../package.json').version,
      },
    });
  }
  tick(codexEnabled: boolean, claudeEnabled: boolean, force = false) {
    if (codexEnabled && (force || Date.now() - this.lastRequest >= 60000)) {
      if (this.process) this.read();
      else this.start();
    } else if (!codexEnabled && this.process) {
      this.stop();
      this.lastRequest = 0;
    }
    if (claudeEnabled) {
      try {
        const file = path.join(this.directory, 'claude-limits.json');
        if (fs.statSync(file).size > 65536) throw new Error('Usage cache oversized');
        this.claude = parseClaudeUsage(JSON.parse(fs.readFileSync(file, 'utf8')));
      } catch {
        this.claude = emptyUsage('claude-statusline');
      }
    }
    if (this.codex.checkedAt && Date.now() - this.codex.checkedAt > 120000)
      this.codex.status = 'stale';
    for (const key of ['fiveHour', 'weekly'] as const)
      if (this.codex[key] && this.codex[key]!.resetsAt <= Date.now()) {
        this.codex[key] = null;
        this.codex.status = 'stale';
      }
  }
  snapshot() {
    return structuredClone({ codex: this.codex, claude: this.claude });
  }
  stop() {
    if (this.timeout) clearTimeout(this.timeout);
    this.process?.kill();
    this.process = null;
    this.initialized = false;
    this.pending = null;
    this.timeout = null;
  }
}
