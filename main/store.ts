import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, validateStore } from './core';
import type { StoreData } from '../shared/types';
export class DataStore {
  data: StoreData;
  recovered = false;
  private file: string;
  private backups: string;
  constructor(directory: string) {
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, 'island-data.json');
    this.backups = path.join(directory, 'backups');
    fs.mkdirSync(this.backups, { recursive: true });
    const candidates = [
      this.file,
      ...fs
        .readdirSync(this.backups)
        .filter((n) => n.endsWith('.json'))
        .sort()
        .reverse()
        .map((n) => path.join(this.backups, n)),
    ];
    let loaded: StoreData | undefined;
    for (const file of candidates) {
      try {
        loaded = validateStore(JSON.parse(fs.readFileSync(file, 'utf8')));
        this.recovered = file !== this.file;
        break;
      } catch {
        /* Try the last known good snapshot. */
      }
    }
    this.data = loaded ?? {
      schemaVersion: 1,
      settings: { ...DEFAULT_SETTINGS, widgets: [...DEFAULT_SETTINGS.widgets] },
      days: [],
    };
    if (!loaded && fs.existsSync(this.file)) {
      this.recovered = true;
      fs.copyFileSync(this.file, path.join(directory, `corrupt-${Date.now()}.json`));
    }
  }
  backup(): void {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(this.backups, `${stamp}.json`),
      JSON.stringify(this.data, null, 2),
      'utf8',
    );
    const files = fs
      .readdirSync(this.backups)
      .filter((n) => n.endsWith('.json'))
      .sort();
    for (const file of files.slice(0, -14)) fs.unlinkSync(path.join(this.backups, file));
  }
  save(): void {
    const temp = `${this.file}.tmp`;
    const fd = fs.openSync(temp, 'w');
    try {
      fs.writeFileSync(fd, JSON.stringify(this.data, null, 2), 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, this.file);
  }
  replace(input: unknown): void {
    const valid = validateStore(input);
    this.backup();
    this.data = valid;
    this.save();
  }
  export(): string {
    return JSON.stringify(this.data, null, 2);
  }
  csv(): string {
    return (
      '\ufeffdate,estimated_kwh,measured_kwh,tracked_seconds,priced_kwh,cost,currency\n' +
      this.data.days
        .map(
          (d) =>
            `${d.date},${(d.estimatedWh / 1000).toFixed(6)},${(d.measuredWh / 1000).toFixed(6)},${d.trackedSeconds.toFixed(0)},${(d.pricedWh / 1000).toFixed(6)},${d.cost.toFixed(6)},${this.data.settings.currency}`,
        )
        .join('\n')
    );
  }
}
