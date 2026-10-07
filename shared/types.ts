export type WidgetId =
  | 'network'
  | 'power'
  | 'energy'
  | 'system'
  | 'battery'
  | 'clock'
  | 'health'
  | 'insights'
  | 'codex'
  | 'claude';
export type TaskbarMetric =
  | 'cost'
  | 'energy'
  | 'power'
  | 'down'
  | 'up'
  | 'ping'
  | 'sessionEnergy'
  | 'sessionCost'
  | 'codex5h'
  | 'codexWeek'
  | 'claude5h'
  | 'claudeWeek';
export type Presentation = 'island' | 'taskbar' | 'app' | 'both';
export interface BootEnergy extends Omit<DayEnergy, 'date'> {
  startedAt: number;
  firstTrackedAt: number;
  sessionId?: string;
}
export interface UsageWindow {
  usedPercent: number;
  resetsAt: number;
  windowMinutes: number;
}
export interface UsageSample {
  status: 'checking' | 'ready' | 'unavailable' | 'stale';
  checkedAt: number | null;
  fiveHour: UsageWindow | null;
  weekly: UsageWindow | null;
  source: 'codex-app-server' | 'claude-statusline';
}
export type View = 'compact' | 'expanded' | 'settings';
export interface ElectricityProfile {
  city: string;
  district: string;
  subscription: 'residential' | 'other';
  tier: 'low' | 'high';
  onboardingComplete: boolean;
  source: 'manual' | 'epdk';
  effectiveDate: string | null;
  checkedAt: number | null;
}
export interface TariffRequest {
  city: string;
  district: string;
  subscription: 'residential' | 'other';
  tier: 'low' | 'high';
}
export interface TariffQuote {
  price: number;
  energy: number;
  distribution: number;
  vat: number;
  consumptionTax: number;
  effectiveDate: string;
  checkedAt: number;
  documentUrl: string;
}
export interface Settings {
  presentation: Presentation;
  presentationSetupComplete: boolean;
  startupConfigured: boolean;
  compactMode: 'auto' | 'metrics' | 'droplet';
  taskbar: { enabled: boolean; metrics: TaskbarMetric[]; rotate: boolean };
  language: 'tr' | 'en';
  widgets: WidgetId[];
  tariff: number | null;
  electricity: ElectricityProfile;
  currency: 'TRY' | 'USD' | 'EUR';
  idleWatts: number;
  maxWatts: number;
  powerMode: 'estimate' | 'shelly';
  meterHost: string;
  networkInterface: string;
  pingHost: string;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
  reducedMotion: boolean;
  topOffset: number;
  displayId: number | null;
  opacity: number;
  clickThrough: boolean;
  snapToEdge: boolean;
  position: { x: number; y: number } | null;
  sizes: Partial<Record<View, { width: number; height: number }>>;
}
export interface DayEnergy {
  date: string;
  estimatedWh: number;
  measuredWh: number;
  trackedSeconds: number;
  cost: number;
  pricedWh: number;
}
export interface StoreData {
  schemaVersion: 1;
  settings: Settings;
  days: DayEnergy[];
  boot?: BootEnergy;
}
export interface NetworkSample {
  downBps: number | null;
  upBps: number | null;
  interface: string;
  interfaces: { id: string; name: string }[];
  pingMs: number | null;
  jitterMs: number | null;
  loss: number | null;
  status: 'checking' | 'online' | 'degraded' | 'offline';
  probe: string;
}
export interface PowerSample {
  electrical?: {
    voltage: number | null;
    current: number | null;
    frequency: number | null;
    temperature: number | null;
    powerFactor: number | null;
    errors: string[];
  };
  watts: number | null;
  source: 'estimate' | 'meter';
  available: boolean;
}
export interface Snapshot {
  boot?: BootEnergy;
  usage?: { codex: UsageSample; claude: UsageSample };
  time: number;
  cpu: number;
  memoryPercent: number;
  network: NetworkSample;
  power: PowerSample;
  today: DayEnergy;
  history: DayEnergy[];
  battery: { hasBattery: boolean; percent: number | null; charging: boolean };
  error: string | null;
}
export interface UpdateStatus {
  phase: 'idle' | 'checking' | 'available' | 'current' | 'downloading' | 'ready' | 'error';
  version?: string;
  progress?: number;
  message?: string;
}
export interface AppInfo {
  initialView: View;
  version: string;
  platform: string;
  packaged: boolean;
  displays: { id: number; label: string }[];
  backupRecovered: boolean;
  preview: boolean;
}
export interface IslandAPI {
  openUsagePage(provider: 'codex' | 'claude'): Promise<void>;
  onNavigate(callback: (view: View, section?: 'maintenance') => void): () => void;
  refreshUsage(): Promise<void>;
  connectClaude(): Promise<boolean>;
  disconnectClaude(): Promise<boolean>;
  minimize(): Promise<void>;
  onOpenExpanded(callback: () => void): () => void;
  findTariff(request: TariffRequest): Promise<{ settings: Settings; quote: TariffQuote }>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;
  getSnapshot(): Promise<Snapshot | null>;
  getInfo(): Promise<AppInfo>;
  getLayout(): Promise<{ docked: boolean }>;
  onLayout(callback: (layout: { docked: boolean }) => void): () => void;
  setView(view: View): Promise<void>;
  hide(): Promise<void>;
  quit(): Promise<void>;
  center(): Promise<void>;
  resize(corner: string, phase: 'start' | 'move' | 'end'): Promise<void>;
  setPointerPassthrough(ignore: boolean): Promise<void>;
  exportBackup(): Promise<boolean>;
  importBackup(): Promise<boolean>;
  exportCsv(): Promise<boolean>;
  checkUpdate(): Promise<void>;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  onSnapshot(callback: (snapshot: Snapshot) => void): () => void;
  onUpdate(callback: (status: UpdateStatus) => void): () => void;
  onSettings(callback: (settings: Settings) => void): () => void;
}
export interface TaskbarAPI {
  getState(): Promise<{ settings: Settings; snapshot: Snapshot | null; preview: boolean }>;
  onState(
    callback: (state: { settings: Settings; snapshot: Snapshot | null; preview: boolean }) => void,
  ): () => void;
  showIsland(): Promise<void>;
}
