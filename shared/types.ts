export type WidgetId = 'network' | 'power' | 'energy' | 'system' | 'battery' | 'clock';
export type View = 'compact' | 'expanded' | 'settings';
export interface Settings {
  language: 'tr' | 'en';
  widgets: WidgetId[];
  tariff: number | null;
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
  watts: number | null;
  source: 'estimate' | 'meter';
  available: boolean;
}
export interface Snapshot {
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
