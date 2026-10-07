import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import {
  DEFAULT_SETTINGS,
  estimateWatts,
  integrateEnergy,
  validateSettings,
  validateStore,
  validPrivateHost,
  localDate,
  emptyDay,
  locateDisplay,
} from '../main/core';
import { DataStore } from '../main/store';
import type { DayEnergy } from '../shared/types';
test('valid settings are copied and unsafe probes are rejected', () => {
  const s = validateSettings(DEFAULT_SETTINGS);
  assert.notEqual(s.widgets, DEFAULT_SETTINGS.widgets);
  for (const pingHost of ["a';whoami;#", '-n', 'x & x', ''])
    assert.throws(() => validateSettings({ ...s, pingHost }));
  assert.throws(() => validateSettings({ ...s, widgets: ['power', 'power'] }));
  assert.throws(() => validateSettings({ ...s, widgets: [] }));
  assert.throws(() => validateSettings({ ...s, tariff: NaN }));
  assert.throws(() => validateSettings({ ...s, idleWatts: 400, maxWatts: 200 }));
});
test('display placement follows dragged geometry across negative and vertical monitor coordinates', () => {
  const displays = [
    { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
    { id: 2, workArea: { x: -1600, y: 120, width: 1600, height: 900 } },
    { id: 3, workArea: { x: 0, y: -1200, width: 1920, height: 1200 } },
  ];
  assert.equal(locateDisplay(displays, { x: -1400, y: 150, width: 400, height: 68 }, 1).id, 2);
  assert.equal(locateDisplay(displays, { x: 200, y: -1100, width: 400, height: 68 }, 1).id, 3);
  assert.equal(locateDisplay(displays, { x: -100, y: 150, width: 400, height: 68 }, 2).id, 1);
  assert.equal(
    locateDisplay(displays.slice(0, 2), { x: 200, y: -1100, width: 400, height: 68 }, 3).id,
    1,
  );
  assert.equal(locateDisplay(displays, null, 2).id, 2);
  assert.throws(() => locateDisplay([], null, null));
});
test('meter accepts only local plain hosts and never injected URLs', () => {
  for (const host of ['192.168.1.10', '10.0.0.5', '172.16.0.4', 'localhost', '127.0.0.1'])
    assert.equal(validPrivateHost(host), true);
  for (const host of [
    '8.8.8.8',
    '169.254.169.254',
    'http://192.168.1.10',
    '192.168.1.999',
    '192.168.1.1@evil.com',
    '172.32.0.1',
    '010.0.0.5',
    '192.168.01.1',
  ])
    assert.equal(validPrivateHost(host), false);
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, powerMode: 'shelly', meterHost: '' }),
  );
});
test('estimate respects calibrated bounds', () => {
  assert.equal(estimateWatts(-4, DEFAULT_SETTINGS), 65);
  assert.equal(estimateWatts(1000, DEFAULT_SETTINGS), 350);
  assert.equal(estimateWatts(50, DEFAULT_SETTINGS), 207.5);
});
test('personalization is bounded and earlier schema-v1 settings receive additive defaults', () => {
  const previous: any = { ...DEFAULT_SETTINGS };
  delete previous.opacity;
  delete previous.clickThrough;
  delete previous.position;
  delete previous.sizes;
  delete previous.snapToEdge;
  const restored = validateSettings(previous);
  assert.equal(restored.opacity, 1);
  assert.equal(restored.clickThrough, false);
  assert.equal(restored.position, null);
  assert.deepEqual(restored.sizes, {});
  assert.equal(restored.snapToEdge, true);
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, sizes: { expanded: { width: 100, height: 500 } } }),
  );
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, sizes: { rogue: { width: 560, height: 500 } } }),
  );
  const sizes = { expanded: { width: 640, height: 600 } };
  assert.deepEqual(validateSettings({ ...DEFAULT_SETTINGS, sizes }).sizes, sizes);
  assert.notEqual(validateSettings({ ...DEFAULT_SETTINGS, sizes }).sizes, sizes);
  assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, opacity: 0 }));
  assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, position: { x: Infinity, y: 0 } }));
  const position = { x: -1800, y: 220 };
  const s = validateSettings({ ...DEFAULT_SETTINGS, position, opacity: 0.4, clickThrough: true });
  assert.deepEqual(s.position, position);
  assert.notEqual(s.position, position);
});
test('watts integrate to Wh and price by the current tariff', () => {
  const days: DayEnergy[] = [];
  const from = new Date(2026, 9, 7, 12).getTime();
  for (let i = 0; i < 1800; i++)
    integrateEnergy(days, from + i * 2000, from + (i + 1) * 2000, 100, false, 3.5);
  assert.ok(Math.abs(days[0].estimatedWh - 100) < 1e-8);
  assert.ok(Math.abs(days[0].cost - 0.35) < 1e-8);
  assert.equal(days[0].trackedSeconds, 3600);
  assert.equal(days[0].measuredWh, 0);
});
test('midnight splits records by local date', () => {
  const days: DayEnergy[] = [];
  const from = new Date(2026, 9, 7, 23, 59, 58).getTime();
  integrateEnergy(days, from, from + 4000, 360, true, 4);
  assert.equal(days.length, 2);
  assert.equal(days[0].date, '2026-10-07');
  assert.equal(days[1].date, '2026-10-08');
  assert.equal(days[0].measuredWh, 0.2);
  assert.equal(days[1].measuredWh, 0.2);
});
test('sleep gaps and bad samples cannot inflate a bill', () => {
  const days: DayEnergy[] = [];
  integrateEnergy(days, 0, 3600000, 300, false, 3);
  integrateEnergy(days, 0, 2000, NaN, false, 3);
  integrateEnergy(days, 2000, 0, 300, false, 3);
  assert.equal(days.length, 0);
});
test('unpriced energy stays unpriced and tariff changes are prospective', () => {
  const days: DayEnergy[] = [];
  const from = new Date(2026, 9, 7, 12).getTime();
  integrateEnergy(days, from, from + 2000, 1800, false, null);
  integrateEnergy(days, from + 2000, from + 4000, 1800, true, 4);
  assert.equal(days[0].estimatedWh, 1);
  assert.equal(days[0].measuredWh, 1);
  assert.equal(days[0].pricedWh, 1);
  assert.equal(days[0].cost, 0.004);
});
test('history stays bounded and corrupt or future backups are rejected', () => {
  const days = Array.from({ length: 366 }, (_, i) =>
    emptyDay(localDate(new Date(2025, 0, i + 1).getTime())),
  );
  const from = new Date(2026, 9, 7).getTime();
  integrateEnergy(days, from, from + 2000, 100, false, null);
  assert.equal(days.length, 366);
  assert.throws(() => validateStore({ schemaVersion: 2, settings: DEFAULT_SETTINGS, days: [] }));
  assert.throws(() =>
    validateStore({ schemaVersion: 1, settings: DEFAULT_SETTINGS, days: [emptyDay('2026-02-30')] }),
  );
  assert.throws(() =>
    validateStore({
      schemaVersion: 1,
      settings: DEFAULT_SETTINGS,
      days: [emptyDay('2026-10-07'), emptyDay('2026-10-07')],
    }),
  );
});
test('atomic store writes, CSV and backup recovery preserve history', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'island-test-'));
  try {
    const store = new DataStore(dir);
    store.data.days.push({ ...emptyDay('2026-10-07'), estimatedWh: 125, trackedSeconds: 4500 });
    store.save();
    store.backup();
    assert.equal(new DataStore(dir).data.days[0].estimatedWh, 125);
    assert.match(store.csv(), /0\.125000/);
    fs.writeFileSync(path.join(dir, 'island-data.json'), '{broken');
    const recovered = new DataStore(dir);
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.data.days[0].estimatedWh, 125);
    assert.throws(() => recovered.replace({ schemaVersion: 99 }));
    assert.equal(recovered.data.days[0].estimatedWh, 125);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('release manifests merge both mac architectures and reject mismatched versions', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'island-release-test-'));
  const script = path.resolve('scripts/merge-artifacts.cjs');
  try {
    for (const arch of ['arm64', 'x64']) {
      const folder = path.join(dir, 'packages', `packages-mac-${arch}`);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, `island-${arch}.zip`), 'fixture');
      fs.writeFileSync(path.join(folder, 'builder-debug.yml'), 'diagnostics: true');
      fs.writeFileSync(
        path.join(folder, 'alpha-mac.yml'),
        JSON.stringify({
          version: '0.1.0-alpha.1',
          files: [{ url: `island-${arch}.zip`, sha512: 'fixture', size: 7 }],
        }),
      );
    }
    execFileSync(process.execPath, [script], { cwd: dir });
    const merged = parse(fs.readFileSync(path.join(dir, 'release', 'alpha-mac.yml'), 'utf8'));
    assert.equal(merged.files.length, 2);
    assert.equal(fs.existsSync(path.join(dir, 'release', 'builder-debug.yml')), false);
    fs.rmSync(path.join(dir, 'release'), { recursive: true, force: true });
    fs.writeFileSync(
      path.join(dir, 'packages', 'packages-mac-x64', 'alpha-mac.yml'),
      JSON.stringify({ version: '0.2.0', files: [{ url: 'island-x64.zip' }] }),
    );
    assert.throws(
      () => execFileSync(process.execPath, [script], { cwd: dir, stdio: 'pipe' }),
      (error: any) => String(error.stderr).includes('Mismatched update versions'),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
import { parseResidentialTariff, validateTariffRequest } from '../main/tariff';

test('online tariff parses official residential columns and taxes; unsupported and malformed data fail closed', () => {
  const request = {
    city: 'Ankara',
    district: 'Çankaya',
    subscription: 'residential' as const,
    tier: 'low' as const,
  };
  const rows = [
    ['4 Nisan 2026 Tarihinden İtibaren Geçerli Vergiler Hariç Elektrik Tarifeleri'],
    ['Abone', 'Tek Zamanlı Enerji Bedeli (kr/kWh)', 'Dağıtım Bedeli (kr/kWh)'],
    ['Mesken (8 kWh/gün ve altı)', 49.4065, 242.49],
    ['Mesken (8 kWh/gün üstü)', 189.5808, 242.49],
  ];
  const now = Date.UTC(2026, 9, 7);
  const low = parseResidentialTariff(rows, request, now, 'https://www.epdk.gov.tr/example');
  assert.equal(low.price, 3.238035);
  assert.equal(low.effectiveDate, '2026-04-04');
  assert.equal(
    parseResidentialTariff(rows, { ...request, tier: 'high' }, now, low.documentUrl).price,
    4.857048,
  );
  assert.throws(() => validateTariffRequest({ ...request, city: 'Unknown' }));
  assert.throws(() => validateTariffRequest({ ...request, district: '' }));
  assert.throws(() => validateTariffRequest({ ...request, subscription: 'other' }));
  assert.throws(() => parseResidentialTariff(rows.slice(0, 2), request, now, low.documentUrl));
  assert.throws(() => parseResidentialTariff([...rows, rows[2]], request, now, low.documentUrl));
  assert.throws(() => parseResidentialTariff(rows, request, Date.UTC(2027, 0, 1), low.documentUrl));
  const future = structuredClone(rows);
  future[0][0] = '1 Aralık 2026 Tarihinden İtibaren Geçerli Vergiler Hariç Elektrik Tarifeleri';
  assert.throws(() => parseResidentialTariff(future, request, now, low.documentUrl));
});
