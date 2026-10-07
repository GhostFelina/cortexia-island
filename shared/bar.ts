import type { Settings, TaskbarMetric } from './types';
export const BAR_CYCLE_MS = 10000;
export function barMetrics(settings: Settings['taskbar'], elapsedMs: number): TaskbarMetric[] {
  if (!settings.rotate) return [...settings.metrics];
  const groups: TaskbarMetric[][] = [
    ['sessionCost', 'sessionEnergy'],
    ['codex5h', 'codexWeek'],
    ['claude5h', 'claudeWeek'],
  ];
  const phase =
    Math.floor(Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / BAR_CYCLE_MS) %
    groups.length;
  return [...groups[phase]];
}
