import os from 'node:os';
import { execFile } from 'node:child_process';
import si from 'systeminformation';
import { emptyDay, estimateWatts, integrateEnergy, localDate } from './core';
import type { DataStore } from './store';
import type { Snapshot, NetworkSample, PowerSample } from '../shared/types';
function cpuTimes() {
  return os.cpus().reduce(
    (r, c) => ({
      idle: r.idle + c.times.idle,
      total: r.total + Object.values(c.times).reduce((a, b) => a + b, 0),
    }),
    { idle: 0, total: 0 },
  );
}
function probe(host: string): Promise<number | null> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const command = `$p=New-Object System.Net.NetworkInformation.Ping; try { $r=$p.Send('${host}',1600); if($r.Status -eq 'Success') { [Console]::Write($r.RoundtripTime) } } finally { $p.Dispose() }`;
      execFile(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-EncodedCommand',
          Buffer.from(command, 'utf16le').toString('base64'),
        ],
        { windowsHide: true, timeout: 4500 },
        (err, stdout) => {
          const n = Number(stdout.trim());
          resolve(!err && stdout.trim() !== '' && Number.isFinite(n) ? n : null);
        },
      );
    } else {
      execFile(
        '/sbin/ping',
        ['-n', '-c', '1', '-W', '1600', host],
        { timeout: 4500 },
        (err, stdout) => {
          const m = stdout.match(/time[=<]([\d.]+)\s*ms/);
          resolve(!err && m ? Number(m[1]) : null);
        },
      );
    }
  });
}
export class Telemetry {
  last: Snapshot | null = null;
  private timer: NodeJS.Timeout | null = null;
  private busy = false;
  private oldCpu = cpuTimes();
  private previousTime: number | null = null;
  private previousSource: string | null = null;
  private lastProbe = 0;
  private readings: (number | null)[] = [];
  private pingTarget = '';
  private interfaces: NetworkSample['interfaces'] = [];
  private lastInterfaces = 0;
  private defaultInterface = '';
  private battery: Snapshot['battery'] = { hasBattery: false, percent: null, charging: false };
  private lastBattery = 0;
  private lastPersist = 0;
  constructor(
    private store: DataStore,
    private publish: (sample: Snapshot) => void,
  ) {}
  start() {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 2000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.previousTime = null;
  }
  resetInterval() {
    this.previousTime = null;
    this.lastProbe = 0;
    this.lastInterfaces = 0;
  }
  private async power(cpu: number): Promise<PowerSample> {
    const s = this.store.data.settings;
    if (s.powerMode === 'estimate')
      return { watts: estimateWatts(cpu, s), source: 'estimate', available: true };
    try {
      const response = await fetch(`http://${s.meterHost}/rpc/Switch.GetStatus?id=0`, {
        signal: AbortSignal.timeout(1800),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Meter response');
      const content = await response.text();
      if (content.length > 65536) throw new Error('Meter response too large');
      const data = JSON.parse(content);
      const watts = data.apower;
      if (typeof watts !== 'number' || !Number.isFinite(watts) || watts < 0 || watts > 20000)
        throw new Error('Invalid meter watts');
      return { watts, source: 'meter', available: true };
    } catch {
      return { watts: null, source: 'meter', available: false };
    }
  }
  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const time = Date.now();
      const settings = this.store.data.settings;
      const nowCpu = cpuTimes();
      const total = nowCpu.total - this.oldCpu.total;
      const cpu = Math.max(
        0,
        Math.min(100, total > 0 ? 100 * (1 - (nowCpu.idle - this.oldCpu.idle) / total) : 0),
      );
      this.oldCpu = nowCpu;
      if (time - this.lastInterfaces > 30000) {
        const [list, defaultId] = await Promise.all([
          si.networkInterfaces(),
          si.networkInterfaceDefault(),
        ]);
        const items = Array.isArray(list) ? list : [list];
        const virtualIds = new Set(items.filter((n) => n.virtual).map((n) => n.iface));
        this.interfaces = items
          .filter((n) => !n.internal && !virtualIds.has(n.iface) && n.operstate === 'up')
          .map((n) => ({ id: n.iface, name: n.ifaceName || n.iface }));
        this.defaultInterface = defaultId;
        this.lastInterfaces = time;
      }
      const selected =
        settings.networkInterface === 'auto' ? this.defaultInterface : settings.networkInterface;
      const [stats, power] = await Promise.all([
        si.networkStats(selected || undefined),
        this.power(cpu),
      ]);
      const net = stats.find((n) => n.iface === selected) ?? stats[0];
      if (settings.pingHost !== this.pingTarget) {
        this.readings = [];
        this.lastProbe = 0;
        this.pingTarget = settings.pingHost;
      }
      if (time - this.lastProbe >= 5000) {
        this.lastProbe = time;
        this.readings.push(await probe(settings.pingHost));
        if (this.readings.length > 20) this.readings.shift();
      }
      if (time - this.lastBattery > 30000) {
        const b = await si.battery();
        this.battery = {
          hasBattery: b.hasBattery,
          percent: b.hasBattery ? b.percent : null,
          charging: b.isCharging,
        };
        this.lastBattery = time;
      }
      const successful = this.readings.filter((n): n is number => n !== null);
      const ping = this.readings.length ? this.readings[this.readings.length - 1] : null;
      const deltas = successful.slice(1).map((n, i) => Math.abs(n - successful[i]));
      const jitter = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
      const loss = this.readings.length
        ? (100 * (this.readings.length - successful.length)) / this.readings.length
        : null;
      const active = Boolean(selected && this.interfaces.some((n) => n.id === selected));
      const network: NetworkSample = {
        downBps: net && net.rx_sec >= 0 ? net.rx_sec : null,
        upBps: net && net.tx_sec >= 0 ? net.tx_sec : null,
        interface: selected || '',
        interfaces: this.interfaces,
        pingMs: ping,
        jitterMs: jitter,
        loss,
        probe: settings.pingHost,
        status: !active
          ? 'offline'
          : !this.readings.length
            ? 'checking'
            : ping === null || ping > 100 || (loss ?? 0) > 10
              ? 'degraded'
              : 'online',
      };
      const sampleTime = Date.now();
      if (
        this.previousTime !== null &&
        power.watts !== null &&
        this.previousSource === power.source
      )
        integrateEnergy(
          this.store.data.days,
          this.previousTime,
          sampleTime,
          power.watts,
          power.source === 'meter',
          settings.tariff,
        );
      this.previousTime = power.watts !== null ? sampleTime : null;
      this.previousSource = power.source;
      const today =
        this.store.data.days.find((d) => d.date === localDate(sampleTime)) ??
        emptyDay(localDate(sampleTime));
      const errors: string[] = [];
      if (!power.available) errors.push('meter-unavailable');
      if (!net || net.rx_sec < 0) errors.push('network-unavailable');
      this.last = {
        time: sampleTime,
        cpu,
        memoryPercent: 100 * (1 - os.freemem() / os.totalmem()),
        network,
        power,
        today: { ...today },
        history: this.store.data.days.slice(-7).map((d) => ({ ...d })),
        battery: { ...this.battery },
        error: errors.join(',') || null,
      };
      this.publish(this.last);
      if (sampleTime - this.lastPersist > 30000) {
        this.store.save();
        this.lastPersist = sampleTime;
      }
    } catch (error) {
      console.error(
        'Telemetry provider failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      this.previousTime = null;
      if (this.last) {
        this.last = {
          ...this.last,
          time: Date.now(),
          power: { watts: null, source: this.last.power.source, available: false },
          network: {
            ...this.last.network,
            downBps: null,
            upBps: null,
            pingMs: null,
            status: 'checking',
          },
          error: 'telemetry-unavailable',
        };
        this.publish(this.last);
      }
    } finally {
      this.busy = false;
    }
  }
}
