import type { Settings, WidgetId, DayEnergy, StoreData } from '../shared/types';
export const WIDGETS: WidgetId[] = ['network', 'power', 'energy', 'system', 'battery', 'clock'];
export const DEFAULT_SETTINGS: Settings = {
  language: 'tr',
  widgets: ['network', 'power', 'energy'],
  tariff: null,
  currency: 'TRY',
  idleWatts: 65,
  maxWatts: 350,
  powerMode: 'estimate',
  meterHost: '',
  networkInterface: 'auto',
  pingHost: '1.1.1.1',
  alwaysOnTop: true,
  launchAtLogin: false,
  reducedMotion: false,
  topOffset: 0,
  displayId: null,
  opacity: 1,
  clickThrough: false,
  position: null,
  sizes: {},
};
function numberInRange(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Invalid ${field}`);
  return value;
}
export function validPrivateHost(value: string): boolean {
  if (value === 'localhost' || value === '127.0.0.1') return true;
  const p = value.split('.').map(Number);
  if (
    !/^\d+\.\d+\.\d+\.\d+$/.test(value) ||
    p.some((n) => n < 0 || n > 255) ||
    p.join('.') !== value
  )
    return false;
  return (
    p[0] === 10 || (p[0] === 192 && p[1] === 168) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
  );
}
export function validateSettings(input: unknown): Settings {
  if (!input || typeof input !== 'object') throw new Error('Invalid settings');
  const s = { ...input } as Settings;
  // Additive schema-v1 defaults preserve backups made before personalization existed.
  s.opacity ??= 1;
  s.clickThrough ??= false;
  s.position ??= null;
  s.sizes ??= {};
  if (typeof s.sizes !== 'object' || Array.isArray(s.sizes)) throw new Error('Invalid sizes');
  for (const [view, size] of Object.entries(s.sizes)) {
    if (!['compact', 'expanded', 'settings'].includes(view) || !size)
      throw new Error('Invalid size');
    numberInRange(size.width, 400, 1200, 'size.width');
    numberInRange(size.height, view === 'compact' ? 90 : 260, 1200, 'size.height');
  }
  if (
    !['tr', 'en'].includes(s.language) ||
    !['TRY', 'USD', 'EUR'].includes(s.currency) ||
    !['estimate', 'shelly'].includes(s.powerMode)
  )
    throw new Error('Invalid settings mode');
  if (
    !Array.isArray(s.widgets) ||
    s.widgets.length < 1 ||
    s.widgets.length > WIDGETS.length ||
    new Set(s.widgets).size !== s.widgets.length ||
    s.widgets.some((id) => !WIDGETS.includes(id))
  )
    throw new Error('Invalid widgets');
  if (s.tariff !== null) numberInRange(s.tariff, 0, 10000, 'tariff');
  numberInRange(s.idleWatts, 0, 10000, 'idleWatts');
  numberInRange(s.maxWatts, s.idleWatts, 20000, 'maxWatts');
  numberInRange(s.topOffset, 0, 300, 'topOffset');
  if (
    typeof s.meterHost !== 'string' ||
    (s.meterHost !== '' && !validPrivateHost(s.meterHost)) ||
    (s.powerMode === 'shelly' && !s.meterHost)
  )
    throw new Error('Use a local meter IP address');
  if (typeof s.networkInterface !== 'string' || s.networkInterface.length > 200)
    throw new Error('Invalid network interface');
  if (
    typeof s.pingHost !== 'string' ||
    s.pingHost.length > 253 ||
    !/^[a-zA-Z0-9.-]+$/.test(s.pingHost) ||
    s.pingHost.startsWith('-')
  )
    throw new Error('Invalid ping host');
  for (const key of ['alwaysOnTop', 'launchAtLogin', 'reducedMotion'] as const)
    if (typeof s[key] !== 'boolean') throw new Error(`Invalid ${key}`);
  if (s.displayId !== null && (!Number.isSafeInteger(s.displayId) || s.displayId < 0))
    throw new Error('Invalid display');
  numberInRange(s.opacity, 0.2, 1, 'opacity');
  if (typeof s.clickThrough !== 'boolean') throw new Error('Invalid clickThrough');
  if (s.position !== null) {
    numberInRange(s.position.x, -100000, 100000, 'position.x');
    numberInRange(s.position.y, -100000, 100000, 'position.y');
  }
  return {
    language: s.language,
    widgets: [...s.widgets],
    tariff: s.tariff,
    currency: s.currency,
    idleWatts: s.idleWatts,
    maxWatts: s.maxWatts,
    powerMode: s.powerMode,
    meterHost: s.meterHost,
    networkInterface: s.networkInterface,
    pingHost: s.pingHost,
    alwaysOnTop: s.alwaysOnTop,
    launchAtLogin: s.launchAtLogin,
    reducedMotion: s.reducedMotion,
    topOffset: s.topOffset,
    displayId: s.displayId,
    opacity: s.opacity,
    clickThrough: s.clickThrough,
    position: s.position ? { x: s.position.x, y: s.position.y } : null,
    sizes: structuredClone(s.sizes),
  };
}
export function localDate(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function emptyDay(date: string): DayEnergy {
  return { date, estimatedWh: 0, measuredWh: 0, trackedSeconds: 0, cost: 0, pricedWh: 0 };
}
export function estimateWatts(cpuPercent: number, settings: Settings): number {
  return (
    settings.idleWatts +
    (Math.max(0, Math.min(100, cpuPercent)) / 100) * (settings.maxWatts - settings.idleWatts)
  );
}
// Only integrate continuous samples. Sleep, shutdown and missing readings are never filled in.
export function integrateEnergy(
  days: DayEnergy[],
  from: number,
  to: number,
  watts: number,
  measured: boolean,
  tariff: number | null,
): void {
  if (!Number.isFinite(watts) || watts < 0 || watts > 20000 || to <= from || to - from > 10000)
    return;
  let start = from;
  while (start < to) {
    const d = new Date(start);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    const end = Math.min(to, midnight);
    const seconds = (end - start) / 1000;
    const wh = (watts * seconds) / 3600;
    const date = localDate(start);
    let day = days.find((x) => x.date === date);
    if (!day) {
      day = emptyDay(date);
      days.push(day);
    }
    day[measured ? 'measuredWh' : 'estimatedWh'] += wh;
    day.trackedSeconds += seconds;
    if (tariff !== null) {
      day.cost += (wh / 1000) * tariff;
      day.pricedWh += wh;
    }
    start = end;
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  if (days.length > 366) days.splice(0, days.length - 366);
}
export function validateStore(input: unknown): StoreData {
  if (!input || typeof input !== 'object') throw new Error('Invalid backup');
  const data = input as StoreData;
  if (data.schemaVersion !== 1) throw new Error('Unsupported backup version');
  const settings = validateSettings(data.settings);
  if (!Array.isArray(data.days) || data.days.length > 366)
    throw new Error('Invalid energy history');
  const dates = new Set<string>();
  const days = data.days.map((day) => {
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || dates.has(day.date))
      throw new Error('Invalid energy date');
    const parsed = new Date(`${day.date}T12:00:00`);
    if (!Number.isFinite(parsed.getTime()) || localDate(parsed.getTime()) !== day.date)
      throw new Error('Invalid calendar date');
    dates.add(day.date);
    return {
      date: day.date,
      estimatedWh: numberInRange(day.estimatedWh, 0, 500000, 'energy'),
      measuredWh: numberInRange(day.measuredWh, 0, 500000, 'energy'),
      trackedSeconds: numberInRange(day.trackedSeconds, 0, 90000, 'time'),
      cost: numberInRange(day.cost, 0, 10000000, 'cost'),
      pricedWh: numberInRange(day.pricedWh, 0, 1000000, 'pricedEnergy'),
    };
  });
  return { schemaVersion: 1, settings, days };
}
