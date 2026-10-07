import type {
  Settings,
  WidgetId,
  DayEnergy,
  StoreData,
  PowerSample,
  BootEnergy,
  TaskbarMetric,
} from '../shared/types';
export const TASKBAR_METRICS: TaskbarMetric[] = [
  'cost',
  'energy',
  'power',
  'down',
  'up',
  'ping',
  'sessionEnergy',
  'sessionCost',
  'codex5h',
  'codexWeek',
  'claude5h',
  'claudeWeek',
];
export function trackBoot(
  existing: BootEnergy | undefined,
  now: number,
  uptimeSeconds: number,
  sessionId?: string,
): BootEnergy {
  const startedAt = now - Math.max(0, uptimeSeconds) * 1000;
  if (
    existing &&
    existing.sessionId === sessionId &&
    Math.abs(existing.startedAt - startedAt) < 60000
  )
    return existing;
  return {
    startedAt,
    firstTrackedAt: now,
    ...(sessionId ? { sessionId } : {}),
    estimatedWh: 0,
    measuredWh: 0,
    trackedSeconds: 0,
    cost: 0,
    pricedWh: 0,
  };
}
export function integrateBoot(
  boot: BootEnergy,
  from: number,
  to: number,
  watts: number,
  measured: boolean,
  tariff: number | null,
) {
  if (!Number.isFinite(watts) || watts < 0 || watts > 20000 || to <= from || to - from > 10000)
    return;
  const wh = (watts * (to - from)) / 3600000;
  if (measured) boot.measuredWh += wh;
  else boot.estimatedWh += wh;
  boot.trackedSeconds += (to - from) / 1000;
  if (tariff !== null) {
    boot.pricedWh += wh;
    boot.cost += (wh / 1000) * tariff;
  }
}
export function parseElectricalStatus(input: unknown): NonNullable<PowerSample['electrical']> {
  const d = input as Record<string, unknown>;
  const value = (n: unknown, min: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : null;
  const temp = d?.temperature as { tC?: unknown } | undefined;
  return {
    voltage: value(d?.voltage, 0, 1000),
    current: value(d?.current, 0, 1000),
    frequency: value(d?.freq, 0, 100),
    temperature: value(temp?.tC, -50, 200),
    powerFactor: value(d?.pf, -1, 1),
    errors: Array.isArray(d?.errors)
      ? d.errors
          .filter(
            (e): e is string =>
              typeof e === 'string' &&
              ['overtemp', 'overpower', 'overvoltage', 'undervoltage', 'overcurrent'].includes(e),
          )
          .slice(0, 5)
      : [],
  };
}
export const WIDGETS: WidgetId[] = [
  'network',
  'power',
  'energy',
  'system',
  'battery',
  'clock',
  'health',
  'insights',
  'codex',
  'claude',
];
type Area = { x: number; y: number; width: number; height: number };
export function locateDisplay<T extends { id: number; workArea: Area }>(
  displays: T[],
  bounds: Area | null,
  preferred: number | null,
): T {
  if (!displays.length) throw new Error('No displays');
  if (!bounds) return displays.find((d) => d.id === preferred) ?? displays[0];
  const score = (display: T) => {
    const a = display.workArea;
    const overlap =
      Math.max(0, Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x)) *
      Math.max(0, Math.min(bounds.y + bounds.height, a.y + a.height) - Math.max(bounds.y, a.y));
    if (overlap) return overlap;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const dx = Math.max(a.x - cx, 0, cx - a.x - a.width);
    const dy = Math.max(a.y - cy, 0, cy - a.y - a.height);
    return -dx * dx - dy * dy;
  };
  return displays.reduce(
    (best, display) => (score(display) > score(best) ? display : best),
    displays.find((d) => d.id === preferred) ?? displays[0],
  );
}
export const DEFAULT_SETTINGS: Settings = {
  presentation: 'both',
  presentationSetupComplete: false,
  startupConfigured: false,
  compactMode: 'auto',
  taskbar: { enabled: true, metrics: ['cost', 'energy'], rotate: true },
  language: 'tr',
  widgets: ['energy', 'power', 'network'],
  tariff: null,
  electricity: {
    city: '',
    district: '',
    subscription: 'residential',
    tier: 'low',
    onboardingComplete: false,
    source: 'manual',
    effectiveDate: null,
    checkedAt: null,
  },
  currency: 'TRY',
  idleWatts: 65,
  maxWatts: 350,
  powerMode: 'estimate',
  meterHost: '',
  networkInterface: 'auto',
  pingHost: '1.1.1.1',
  alwaysOnTop: true,
  launchAtLogin: true,
  reducedMotion: false,
  topOffset: 0,
  displayId: null,
  opacity: 1,
  clickThrough: false,
  snapToEdge: true,
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
  s.presentation ??= 'both';
  s.presentationSetupComplete ??= false;
  s.startupConfigured ??= false;
  if (
    !['island', 'taskbar', 'app', 'both'].includes(s.presentation) ||
    typeof s.presentationSetupComplete !== 'boolean' ||
    typeof s.startupConfigured !== 'boolean'
  )
    throw new Error('Invalid presentation');
  // Additive schema-v1 defaults preserve backups made before personalization existed.
  s.opacity ??= 1;
  s.clickThrough ??= false;
  s.position ??= null;
  s.sizes ??= {};
  s.snapToEdge ??= true;
  if (typeof s.sizes !== 'object' || Array.isArray(s.sizes)) throw new Error('Invalid sizes');
  for (const [view, size] of Object.entries(s.sizes)) {
    if (!['compact', 'expanded', 'settings'].includes(view) || !size)
      throw new Error('Invalid size');
    numberInRange(size.width, view === 'compact' ? 320 : 400, 1200, 'size.width');
    numberInRange(size.height, view === 'compact' ? 56 : 260, 1200, 'size.height');
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
  s.compactMode ??= 'auto';
  s.taskbar ??= structuredClone(DEFAULT_SETTINGS.taskbar);
  s.taskbar = { ...s.taskbar, rotate: s.taskbar.rotate ?? true };
  if (
    !['auto', 'metrics', 'droplet'].includes(s.compactMode) ||
    typeof s.taskbar?.enabled !== 'boolean' ||
    typeof s.taskbar.rotate !== 'boolean' ||
    !Array.isArray(s.taskbar.metrics) ||
    s.taskbar.metrics.length < 1 ||
    s.taskbar.metrics.length > 2 ||
    new Set(s.taskbar.metrics).size !== s.taskbar.metrics.length ||
    s.taskbar.metrics.some((m) => !TASKBAR_METRICS.includes(m))
  )
    throw new Error('Invalid taskbar preferences');
  if (s.tariff !== null) numberInRange(s.tariff, 0, 10000, 'tariff');
  s.electricity ??= structuredClone(DEFAULT_SETTINGS.electricity);
  const electricity = s.electricity;
  if (
    !electricity ||
    typeof electricity !== 'object' ||
    typeof electricity.city !== 'string' ||
    electricity.city.length > 60 ||
    typeof electricity.district !== 'string' ||
    electricity.district.length > 60 ||
    !['residential', 'other'].includes(electricity.subscription) ||
    !['low', 'high'].includes(electricity.tier) ||
    typeof electricity.onboardingComplete !== 'boolean' ||
    !['manual', 'epdk'].includes(electricity.source) ||
    (electricity.effectiveDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(electricity.effectiveDate))
  )
    throw new Error('Invalid electricity profile');
  if (electricity.checkedAt !== null)
    numberInRange(electricity.checkedAt, 0, 10000000000000, 'electricity.checkedAt');
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
  if (typeof s.snapToEdge !== 'boolean') throw new Error('Invalid snapToEdge');
  if (s.position !== null) {
    numberInRange(s.position.x, -100000, 100000, 'position.x');
    numberInRange(s.position.y, -100000, 100000, 'position.y');
  }
  return {
    presentation: s.presentation,
    presentationSetupComplete: s.presentationSetupComplete,
    startupConfigured: s.startupConfigured,
    compactMode: s.compactMode,
    taskbar: structuredClone(s.taskbar),
    language: s.language,
    widgets: [...s.widgets],
    tariff: s.tariff,
    electricity: structuredClone(electricity),
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
    snapToEdge: s.snapToEdge,
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
  let boot: BootEnergy | undefined;
  if (data.boot) {
    const b = data.boot;
    if (b.sessionId !== undefined && !/^[a-f0-9]{64}$/.test(b.sessionId))
      throw new Error('Invalid session identity');
    boot = {
      startedAt: numberInRange(b.startedAt, 0, Date.now() + 86400000, 'bootStart'),
      firstTrackedAt: numberInRange(
        b.firstTrackedAt,
        b.startedAt,
        Date.now() + 86400000,
        'bootTrack',
      ),
      estimatedWh: numberInRange(b.estimatedWh, 0, 1e9, 'bootEnergy'),
      measuredWh: numberInRange(b.measuredWh, 0, 1e9, 'bootEnergy'),
      trackedSeconds: numberInRange(b.trackedSeconds, 0, 1e9, 'bootTime'),
      cost: numberInRange(b.cost, 0, 1e12, 'bootCost'),
      pricedWh: numberInRange(b.pricedWh, 0, 2e9, 'bootPricedEnergy'),
      ...(b.sessionId ? { sessionId: b.sessionId } : {}),
    };
  }
  return { schemaVersion: 1, settings, days, ...(boot ? { boot } : {}) };
}
