const path = require('node:path');
const fs = require('node:fs');
const { Telemetry } = require('../out/main/telemetry');
const { DataStore } = require('../out/main/store');
const directory = path.join(__dirname, '..', '.artifacts', 'provider-check');
let samples = 0;
const store = new DataStore(directory);
const timeout = setTimeout(() => {
  console.error('Provider timeout');
  process.exit(1);
}, 60000);
const telemetry = new Telemetry(store, (s) => {
  samples++;
  if (samples < 3) return;
  const ok =
    s.network.downBps !== null &&
    Number.isFinite(s.network.downBps) &&
    s.network.upBps !== null &&
    Number.isFinite(s.network.upBps) &&
    s.power.available &&
    s.cpu >= 0 &&
    s.cpu <= 100 &&
    s.today.trackedSeconds > 0;
  const report = {
    passed: ok,
    samples,
    cpu: s.cpu,
    memoryPercent: s.memoryPercent,
    downBps: s.network.downBps,
    upBps: s.network.upBps,
    pingMs: s.network.pingMs,
    powerSource: s.power.source,
    trackedSeconds: s.today.trackedSeconds,
    adapterCount: s.network.interfaces.length,
  };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  telemetry.stop();
  clearTimeout(timeout);
  process.exit(ok ? 0 : 1);
});
telemetry.start();
