import { barMetrics } from '../shared/bar';
import {
  createElement,
  Wifi,
  Zap,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Settings as SettingsIcon,
  X,
  Minus,
  Plus,
  ChartNoAxesCombined,
  Cpu,
  Battery,
  Clock,
  ShieldCheck,
  LayoutGrid,
  EyeOff,
  Droplet,
  type IconNode,
} from 'lucide';
import './style.css';
import brandMark from '../assets/mark.png';
import { TURKEY_CITIES } from '../shared/locations';
import type {
  Settings,
  Snapshot,
  IslandAPI,
  View,
  AppInfo,
  WidgetId,
  UpdateStatus,
  TaskbarAPI,
  TaskbarMetric,
  UsageSample,
} from '../shared/types';
declare global {
  interface Window {
    island?: IslandAPI;
    islandTaskbar?: TaskbarAPI;
    __islandErrors?: string[];
  }
}
window.__islandErrors = [];
window.addEventListener('error', (e) => window.__islandErrors?.push(e.message));
window.addEventListener('unhandledrejection', (e) => window.__islandErrors?.push(String(e.reason)));
const api = window.island;
let resizingPointer = false;
let dropletPointer = false;
const root = document.querySelector<HTMLDivElement>('#app')!;
let settings: Settings;
let snapshot: Snapshot | null = null;
let info: AppInfo;
let view: View = 'expanded';
let docked = true;
let showHistory = false;
type SettingsTab = 'general' | 'energy' | 'widgets' | 'network' | 'maintenance';
let settingsTab: SettingsTab = 'general';
let update: UpdateStatus = { phase: 'idle' };
const icons: Record<string, IconNode> = {
  wifi: Wifi,
  bolt: Zap,
  down: ArrowDown,
  up: ArrowUp,
  chevron: ChevronDown,
  gear: SettingsIcon,
  close: X,
  minus: Minus,
  plus: Plus,
  chart: ChartNoAxesCombined,
  cpu: Cpu,
  battery: Battery,
  clock: Clock,
  shield: ShieldCheck,
  grid: LayoutGrid,
  eyeOff: EyeOff,
  droplet: Droplet,
};
const icon = (name: string, cls = '') =>
  createElement(icons[name] ?? LayoutGrid, {
    class: 'icon ' + cls,
    'stroke-width': '1.7',
    'aria-hidden': 'true',
  }).outerHTML;
const e = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const t = (tr: string, en: string) => (settings?.language === 'en' ? en : tr);
const fmt = (n: number | null | undefined, d = 1) =>
  n == null
    ? '—'
    : new Intl.NumberFormat(settings.language, {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      }).format(n);
const money = (n: number) =>
  new Intl.NumberFormat(settings.language, {
    style: 'currency',
    currency: settings.currency,
    maximumFractionDigits: 2,
  }).format(n);
const setText = (key: string, text: string) =>
  root
    .querySelectorAll<HTMLElement>(`[data-value="${key}"]`)
    .forEach((el) => (el.textContent = text));
const catalog: Record<
  WidgetId,
  { name: [string, string]; description: [string, string]; icon: string }
> = {
  network: {
    name: ['Ağ sağlığı', 'Network health'],
    description: ['İndirme, yükleme, ping ve dalgalanma', 'Download, upload, ping and jitter'],
    icon: 'wifi',
  },
  power: {
    name: ['Canlı güç', 'Live power'],
    description: ['Watt ve ölçüm kaynağı', 'Watts and reading source'],
    icon: 'bolt',
  },
  energy: {
    name: ['Enerji & maliyet', 'Energy & cost'],
    description: ['Bugünkü tüketim ve yerel geçmiş', 'Today’s energy and local history'],
    icon: 'chart',
  },
  system: {
    name: ['Sistem', 'System'],
    description: ['İşlemci ve bellek kullanımı', 'CPU and memory utilization'],
    icon: 'cpu',
  },
  battery: {
    name: ['Batarya', 'Battery'],
    description: ['Notebook şarjı ve pil yüzdesi', 'Notebook charging and battery level'],
    icon: 'battery',
  },
  clock: {
    name: ['Saat', 'Clock'],
    description: ['Yerel saat ve tarih', 'Local time and date'],
    icon: 'clock',
  },
  health: {
    name: ['Elektrik sağlığı', 'Electrical health'],
    description: [
      'Ölçerden voltaj, akım ve koruma uyarıları',
      'Meter voltage, current and protection reports',
    ],
    icon: 'shield',
  },
  insights: {
    name: ['Enerji içgörüleri', 'Energy insights'],
    description: [
      'Tüketim ritmi ve açık varsayımlı projeksiyonlar',
      'Consumption rhythm and transparent projections',
    ],
    icon: 'chart',
  },
  codex: {
    name: ['Codex limitleri', 'Codex limits'],
    description: [
      'Canlı 5 saatlik ve haftalık hesap kullanımı',
      'Live five-hour and weekly account usage',
    ],
    icon: 'cpu',
  },
  claude: {
    name: ['Claude limitleri', 'Claude limits'],
    description: [
      'Claude Code’dan 5 saatlik ve haftalık veri',
      'Five-hour and weekly reports from Claude Code',
    ],
    icon: 'chart',
  },
};
const taskbarLabels: Record<TaskbarMetric, [string, string]> = {
  cost: ['Bugün · tahmini', 'Today · estimated'],
  energy: ['Takip · kWh', 'Tracked · kWh'],
  power: ['Anlık · W', 'Live · W'],
  down: ['İndirme · Mbps', 'Download · Mbps'],
  up: ['Yükleme · Mbps', 'Upload · Mbps'],
  ping: ['Ping · ms', 'Ping · ms'],
  sessionEnergy: ['PC oturumu · kWh', 'PC session · kWh'],
  sessionCost: ['Oturum · tahmini', 'Session · estimated'],
  codex5h: ['Codex · 5h %', 'Codex · 5h %'],
  codexWeek: ['Codex · hafta %', 'Codex · week %'],
  claude5h: ['Claude · 5h %', 'Claude · 5h %'],
  claudeWeek: ['Claude · hafta %', 'Claude · week %'],
};
function usageCard(id: 'codex' | 'claude') {
  return `<section class="usage-card ${id}" data-widget-card="${id}"><div class="card-heading"><span>${icon(id === 'codex' ? 'cpu' : 'chart')}${id === 'codex' ? 'CODEX' : 'CLAUDE'}</span><span class="source-chip" data-value="${id}-status">—</span></div>${(['fiveHour', 'weekly'] as const).map((window) => `<div class="usage-row"><div><span>${window === 'fiveHour' ? t('5 saatlik kullanım', '5-hour usage') : t('Haftalık kullanım', 'Weekly usage')}</span><strong data-value="${id}-${window}">—</strong></div><div class="usage-track" role="progressbar" aria-label="${id} ${window}" aria-valuemin="0" aria-valuemax="100" data-usage="${id}-${window}"><i></i></div><small data-value="${id}-${window}-reset">—</small></div>`).join('')}<p class="microcopy" data-value="${id}-checked">—</p><div class="usage-actions"><button data-action="usage-refresh">${t('Yenile', 'Refresh')}</button>${id === 'claude' ? `<button data-action="claude-connect">${t('Claude Code’u bağla', 'Connect Claude Code')}</button>` : ''}<button data-action="${id}-usage-page">${t('Kullanım sayfası', 'Usage page')}</button></div></section>`;
}
function widgetCardsHtml() {
  const factory: Record<WidgetId, () => string> = {
    network: networkCard,
    power: powerCard,
    energy: energyCard,
    health: healthCard,
    insights: insightsCard,
    codex: () => usageCard('codex'),
    claude: () => usageCard('claude'),
    system: () => smallCard('system'),
    battery: () => smallCard('battery'),
    clock: () => smallCard('clock'),
  };
  return settings.widgets
    .map(
      (id, i) =>
        factory[id]() +
        (['energy', 'power'].includes(id) &&
        ['energy', 'power'].includes(settings.widgets[i + 1]) &&
        id !== settings.widgets[i + 1]
          ? `<div class="energy-bridge" aria-hidden="true"><span></span>${icon('bolt')}</div>`
          : ''),
    )
    .join('');
}
function arrangeSettings() {
  const form = root.querySelector<HTMLFormElement>('#settings-form')!;
  const sections = [...form.querySelectorAll<HTMLElement>(':scope > section')];
  for (const section of sections) {
    const title = section.querySelector('h2')?.textContent ?? '';
    section.dataset.settingsTab =
      section.id === 'widget-list'
        ? 'widgets'
        : section.classList.contains('maintenance')
          ? 'maintenance'
          : section.classList.contains('tariff-setup') ||
              title.includes('ENERJİ') ||
              title.includes('ENERGY')
            ? 'energy'
            : title.includes('BAĞLANTI') || title.includes('CONNECTION')
              ? 'network'
              : 'general';
  }
  const nav = document.createElement('nav');
  nav.className = 'settings-nav';
  nav.setAttribute('aria-label', t('Ayar bölümleri', 'Settings sections'));
  const tabs: Record<SettingsTab, [string, string]> = {
    general: ['Genel', 'General'],
    energy: ['Elektrik', 'Energy'],
    widgets: ['Widget’lar', 'Widgets'],
    network: ['İnternet', 'Network'],
    maintenance: ['Veri & sürüm', 'Data & version'],
  };
  nav.innerHTML = (Object.keys(tabs) as SettingsTab[])
    .map(
      (tab) =>
        `<button type="button" data-tab="${tab}" aria-pressed="${settingsTab === tab}">${t(...tabs[tab])}</button>`,
    )
    .join('');
  form.prepend(nav);
  const activate = (tab: SettingsTab) => {
    settingsTab = tab;
    for (const section of sections) section.hidden = section.dataset.settingsTab !== tab;
    nav
      .querySelectorAll<HTMLElement>('[data-tab]')
      .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.tab === tab)));
    form.scrollTop = 0;
  };
  nav
    .querySelectorAll<HTMLElement>('[data-tab]')
    .forEach((button) =>
      button.addEventListener('click', () => activate(button.dataset.tab as SettingsTab)),
    );
  form.addEventListener(
    'invalid',
    (event) => {
      const section = (event.target as Element)?.closest<HTMLElement>('[data-settings-tab]');
      if (section) activate(section.dataset.settingsTab as SettingsTab);
    },
    true,
  );
  activate(settingsTab);
}
function isDroplet() {
  return (
    view === 'compact' &&
    (settings.compactMode === 'droplet' ||
      (settings.compactMode === 'auto' && info.platform === 'darwin'))
  );
}
function healthCard() {
  return `<section class="health-card" data-widget-card="health"><div class="card-heading"><span>${icon('shield')}${t('ELEKTRİK SAĞLIĞI', 'ELECTRICAL HEALTH')}</span><span class="source-chip">${t('ÖLÇER', 'METER')}</span></div><p class="health-status" data-value="health">—</p><div class="electrical-grid">${[
    ['voltage', 'Voltaj / Voltage', 'V'],
    ['current', t('Akım', 'Current'), 'A'],
    ['frequency', t('Frekans', 'Frequency'), 'Hz'],
    ['temperature', t('Ölçer sıcaklığı', 'Meter temperature'), '°C'],
    ['powerFactor', t('Güç faktörü', 'Power factor'), ''],
  ]
    .map(
      ([key, label, unit]) =>
        `<div><span>${label}</span><strong><b data-value="${key}">—</b><small> ${unit}</small></strong></div>`,
    )
    .join(
      '',
    )}</div><p class="microcopy">${t('Bu veriler ölçerin bildirimleridir; şebeke veya PSU güvenlik teşhisi değildir. Eksik değerler tahmin edilmez.', 'These are meter reports, not a grid or PSU safety diagnosis. Missing values are not estimated.')}</p></section>`;
}
function insightsCard() {
  return `<section class="insights-card" data-widget-card="insights"><div class="card-heading"><span>${icon('chart')}${t('ENERJİ İÇGÖRÜLERİ', 'ENERGY INSIGHTS')}</span></div><div class="insight-row"><span>${t('Takip edilen ortalama güç', 'Average tracked power')}</span><strong data-value="average-power">—</strong></div><div class="insight-row"><span>${t('Bu güç sabit kalırsa · 100 saat', 'If this power stays constant · 100 hours')}</span><strong data-value="projection">—</strong></div><p class="microcopy">${t('1 kWh = 100 W ile 10 saat. Uygulama kapalıyken tüketim eklenmez. Uykuya geçmek tüketimi azaltabilir; tasarruf miktarı cihazına bağlıdır.', '1 kWh = 10 hours at 100 W. Energy is not tracked while closed. Sleep can reduce consumption; savings depend on your device.')}</p></section>`;
}
function bindDroplet() {
  const drop = root.querySelector<HTMLButtonElement>('.droplet-control');
  if (!drop) return;
  let origin = 0,
    stretch = 0,
    active = false,
    suppressClick = false;
  drop.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    origin = event.clientY;
    stretch = 0;
    active = true;
    dropletPointer = true;
    void api?.setPointerPassthrough(false);
    suppressClick = false;
    drop.setPointerCapture(event.pointerId);
    drop.style.transition = 'none';
  });
  drop.addEventListener('pointermove', (event) => {
    if (!active) return;
    stretch = Math.max(-12, Math.min(44, event.clientY - origin));
    if (Math.abs(stretch) > 4) suppressClick = true;
    if (!settings.reducedMotion)
      drop.style.transform = `translateY(${stretch * 0.22}px) scale(${1 - Math.abs(stretch) / 300},${1 + Math.abs(stretch) / 130})`;
  });
  const finish = (event: PointerEvent) => {
    if (!active) return;
    active = false;
    dropletPointer = false;
    if (drop.hasPointerCapture(event.pointerId)) drop.releasePointerCapture(event.pointerId);
    drop.style.transition = settings.reducedMotion
      ? 'none'
      : 'transform 520ms cubic-bezier(.2,1.6,.35,1)';
    drop.style.transform = '';
    if (event.type !== 'pointercancel' && stretch >= 32) void action('expand');
  };
  drop.addEventListener('pointerup', finish);
  drop.addEventListener('pointercancel', finish);
  drop.addEventListener('lostpointercapture', () => {
    active = false;
    dropletPointer = false;
    drop.style.transform = '';
  });
  drop.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      return;
    }
    void action('expand');
  });
}
function button(action: string, label: string, glyph: string, cls = '') {
  return `<button class="icon-button ${cls}" data-action="${action}" aria-label="${label}" title="${label}">${icon(glyph)}</button>`;
}
function networkCard() {
  return `<section class="network-card" data-widget-card="network"><div class="card-heading"><span>${icon('wifi')} ${t('AĞ AKIŞI', 'NETWORK FLOW')}</span><span class="live-label"><i class="status-dot" data-status></i><span data-value="status">${t('Bağlanıyor', 'Connecting')}</span></span></div><div class="traffic"><div><span class="metric-label">${icon('down')}${t('İNDİRME', 'DOWNLOAD')}</span><div class="big cyan"><span data-value="down">—</span><small>Mbps</small></div><svg class="sparkline cyan" viewBox="0 0 220 30" preserveAspectRatio="none" aria-hidden="true"><path data-spark="down" d="M0 29H220"/></svg></div><div><span class="metric-label">${icon('up')}${t('YÜKLEME', 'UPLOAD')}</span><div class="big violet"><span data-value="up">—</span><small>Mbps</small></div><svg class="sparkline violet" viewBox="0 0 220 30" preserveAspectRatio="none" aria-hidden="true"><path data-spark="up" d="M0 29H220"/></svg></div></div><div class="network-detail"><div><span>Ping</span><strong><span data-value="ping">—</span><small> ms</small></strong></div><div><span>Jitter</span><strong><span data-value="jitter">—</span><small> ms</small></strong></div><div><span>${t('Yanıt kaybı', 'Reply loss')}</span><strong><span data-value="loss">—</span><small> %</small></strong></div></div><div class="probe-note" data-value="probe">${t('Adaptör okunuyor…', 'Reading adapter…')}</div></section>`;
}
function powerCard() {
  return `<section class="power-card" data-widget-card="power"><div class="power-main"><div class="power-orb">${icon('bolt')}</div><div><span class="metric-label">${t('ANLIK GÜÇ', 'LIVE POWER')}</span><div class="power-number"><span data-value="watts">—</span><small> W</small></div></div><span class="source-chip" data-value="source">${t('TAHMİN', 'ESTIMATE')}</span></div><div class="power-track"><span data-power-fill></span></div><p class="microcopy" data-value="power-note">${t('Yük profiline göre hesaplanır', 'Calculated from your load profile')}</p></section>`;
}
function energyCard() {
  return `<section class="energy-card money-hero" data-widget-card="energy"><div class="money-heading"><span>${t('BU PC OTURUMUNUN TAHMİNİ MALİYETİ', 'ESTIMATED COST THIS PC SESSION')}</span><span class="energy-tag">${icon('bolt')}${t('ELEKTRİK', 'ENERGY')}</span></div><div class="money-total" data-value="hero-cost">—</div><button class="tariff-cta" data-action="tariff" ${settings.tariff !== null ? 'hidden' : ''}>${t('Elektrik tarifeni bul', 'Find electricity tariff')}${icon('plus')}</button><div class="energy-summary"><div><span>${t('Kullanılan elektrik · takip edilen', 'Electricity used · tracked')}</span><strong><span data-value="session-energy">—</span><small>kWh</small></strong></div><div><span>${t('Bu güçle saatlik tahmin', 'Estimated hourly at this power')}</span><strong data-value="hourly-cost">—</strong></div></div><div class="daily-summary" data-value="daily-summary">—</div><p class="microcopy" data-value="tracked">${t('Oturum açıldıktan sonra uygulama aktifken takip edilir', 'Tracked while running after login')}</p></section>`;
}
function smallCard(id: WidgetId) {
  const c = catalog[id];
  return `<section class="small-card" data-widget-card="${id}"><span>${icon(c.icon)}${t(...c.name)}</span><strong data-value="${id}">—</strong></section>`;
}
function historyHtml() {
  return `<section class="history-card"><div class="card-heading"><span>${icon('chart')}${t('SON 7 KAYITLI GÜN', 'LAST 7 RECORDED DAYS')}</span></div><div data-history></div><p class="microcopy">${t('Takip edilmeyen saatler hesaba eklenmez. Yeşil: ölçülen · gri: tahmin.', 'Untracked hours are excluded. Green: measured · gray: estimated.')}</p></section>`;
}
function compactWidget(id: WidgetId) {
  const value = (key: string, unit: string, symbol: string, color = '') =>
    `<span class="compact-value ${color}">${icon(symbol)}<strong data-value="${key}">—</strong><small>${unit}</small></span>`;
  if (id === 'network')
    return `<span class="compact-stat">${value('down', 'Mbps', 'down', 'cyan')}<span class="compact-context">${icon('up')}<b data-value="up">—</b><span>Mbps</span><i class="compact-dot" data-status></i><b data-value="ping">—</b><span>ms</span></span></span>`;
  if (id === 'power')
    return `<span class="compact-stat">${value('watts', 'W', 'bolt', 'warm')}<span class="compact-context"><span data-value="source">${t('TAHMİN', 'ESTIMATE')}</span><span>· ${t('güç', 'power')}</span></span></span>`;
  if (id === 'energy')
    return `<span class="compact-stat compact-money"><span class="compact-value"><strong data-value="compact-cost">—</strong></span><span class="compact-context">${t('PC OTURUMU', 'PC SESSION')}<span class="context-dot">·</span><b data-value="session-energy">—</b><span>kWh</span></span></span>`;
  if (id === 'system')
    return `<span class="compact-stat">${value('compact-cpu', '%', 'cpu')}<span class="compact-context">CPU</span></span>`;
  if (id === 'battery')
    return `<span class="compact-stat">${value('compact-battery', '%', 'battery')}<span class="compact-context">${t('BATARYA', 'BATTERY')}</span></span>`;
  if (id === 'health')
    return `<span class="compact-stat">${value('voltage', 'V', 'shield')}<span class="compact-context">${t('ÖLÇER', 'METER')}</span></span>`;
  if (id === 'codex' || id === 'claude')
    return `<span class="compact-stat">${value(id + '-fiveHour', '%', 'chart')}<span class="compact-context">${id === 'codex' ? 'CODEX' : 'CLAUDE'} · 5h</span></span>`;
  if (id === 'insights')
    return `<span class="compact-stat">${value('average-power', '', 'chart')}<span class="compact-context">${t('ORTALAMA', 'AVERAGE')}</span></span>`;
  return `<span class="compact-stat">${value('clock', '', 'clock')}<span class="compact-context">${t('YEREL SAAT', 'LOCAL TIME')}</span></span>`;
}
function render() {
  root.className = `view-${view}${settings.reducedMotion ? ' reduced-motion' : ''}${docked && settings.presentation !== 'app' ? ' edge-attached' : ''}${isDroplet() ? ' droplet-mode' : ''}${settings.presentation === 'app' ? ' application-mode' : ''}`;
  if (isDroplet()) {
    root.innerHTML = `<main class="island droplet-island"><div class="droplet-grip drag-area" title="${t('Sürükleyerek taşı', 'Drag to move')}"></div><button class="droplet-control" aria-label="${t('Adayı aç · aşağı çekerek esnet', 'Open island · pull down to stretch')}">${icon('droplet')}<span class="drop-glint"></span></button></main>`;
    bindDroplet();
  } else if (view === 'compact') {
    root.innerHTML = `<main class="island compact"><div class="compact-brand drag-area"><span class="lens"></span></div><button class="compact-readout" data-action="expand" aria-label="${t('Adayı genişlet', 'Expand island')}">${settings.widgets.slice(0, 2).map(compactWidget).join('<span class="compact-separator"></span>')}</button>${button('expand', t('Genişlet', 'Expand'), 'chevron')}</main>`;
  } else if (view === 'expanded') {
    root.innerHTML = `<main class="island expanded"><header><div class="brand drag-area"><span class="lens"></span><span>Cortexia <b>Island</b></span><span class="beta">${info.preview ? 'DEMO' : 'α'}</span></div><div class="header-controls">${button('settings', t('Ayarlar', 'Settings'), 'gear')}${button('compact', t('Küçült', 'Collapse'), 'minus')}</div></header><div class="scroll-body">${showHistory ? historyHtml() : widgetCardsHtml()}</div><footer><span class="footer-status"><i class="status-dot" data-status></i><span data-value="footer">${t('Ölçüm başlıyor', 'Starting readings')}</span></span><div class="footer-actions">${button('history', t('Tüketim geçmişi', 'Energy history'), 'chart', showHistory ? 'active' : '')}${button('widgets', t('Widget ekle', 'Add widgets'), 'plus')}</div></footer><div class="error-banner" data-error hidden></div></main>`;
  } else {
    root.innerHTML = settingsHtml();
  }
  if (view === 'settings') {
    insertPersonalization();
    root.querySelector('#settings-form')?.insertAdjacentHTML('afterbegin', tariffSetupHtml());
    arrangeSettings();
    const energySection = root.querySelector('[name="powerMode"]')?.closest('section');
    if (energySection) {
      const advanced = document.createElement('details');
      advanced.className = 'advanced-energy';
      advanced.innerHTML = `<summary>${t('Güç kaynağı ve cihaz profili · gelişmiş', 'Power source and device profile · advanced')}</summary>`;
      for (const child of [...energySection.children])
        if (!child.classList.contains('section-title')) advanced.appendChild(child);
      energySection.appendChild(advanced);
    }
  }
  root.querySelectorAll('.lens').forEach((el) => {
    const image = document.createElement('img');
    image.src = brandMark;
    image.className = 'brand-mark';
    image.alt = '';
    el.replaceWith(image);
  });
  if (view === 'expanded')
    root
      .querySelector('.header-controls')
      ?.insertAdjacentHTML(
        'afterbegin',
        button('hide', t('Gizle · kısayolla geri getir', 'Hide · restore with shortcut'), 'eyeOff'),
      );
  root
    .querySelectorAll<HTMLElement>('[data-action]')
    .forEach((el) => el.addEventListener('click', () => void action(el.dataset.action!)));
  if (view === 'settings') bindSettings();
  for (const side of ['left', 'right']) {
    const shoulder = document.createElement('span');
    shoulder.className = `notch-shoulder ${side}`;
    root.appendChild(shoulder);
  }
  const island = root.querySelector('.island');
  for (const corner of isDroplet() ? [] : ['nw', 'ne', 'sw', 'se']) {
    const handle = document.createElement('div');
    handle.className = `resize-handle resize-${corner}`;
    handle.setAttribute(
      'aria-label',
      t('Köşeden sürükleyerek boyutlandır', 'Drag corner to resize'),
    );
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      resizingPointer = true;
      handle.setPointerCapture(event.pointerId);
      void api?.resize(corner, 'start');
    });
    handle.addEventListener('pointermove', (event) => {
      if (handle.hasPointerCapture(event.pointerId)) void api?.resize(corner, 'move');
    });
    const finish = (event: PointerEvent) => {
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
        resizingPointer = false;
        void api?.resize(corner, 'end');
      }
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    island?.appendChild(handle);
  }
  paint();
}
function settingsHtml() {
  const selected = new Set(settings.widgets);
  const widgets = [
    ...settings.widgets,
    ...(Object.keys(catalog) as WidgetId[]).filter((id) => !selected.has(id)),
  ];
  return `<main class="island settings"><header><div class="brand drag-area"><span class="lens"></span><span>${t('Ada ayarları', 'Island settings')}</span>${info.preview ? '<span class="demo-badge">DEMO</span>' : ''}</div>${button('expand', t('Geri dön', 'Go back'), 'close')}</header><form id="settings-form" class="scroll-body settings-body"><section id="widget-list"><div class="section-title">${icon('grid')}<h2>${t('ADANI OLUŞTUR', 'BUILD YOUR ISLAND')}</h2><span>${settings.widgets.length}/10</span></div><p class="section-intro">${t('İstediğin widget’ları ekle, sıralarını değiştir.', 'Choose your widgets and arrange their order.')}</p><div class="widget-list">${widgets
    .map((id) => {
      const c = catalog[id],
        idx = settings.widgets.indexOf(id);
      return `<div class="widget-option"><div class="widget-icon ${id}">${icon(c.icon)}</div><div class="widget-description"><strong>${t(...c.name)}</strong><span>${t(...c.description)}</span></div>${idx >= 0 ? `<button type="button" class="reorder" data-reorder="${id}" aria-label="${t('Yukarı taşı', 'Move up')}" ${idx === 0 ? 'disabled' : ''}>${icon('up')}</button>` : ''}<label class="switch"><input name="widget" type="checkbox" value="${id}" ${selected.has(id) ? 'checked' : ''} aria-label="${t(...c.name)}"><span></span></label></div>`;
    })
    .join(
      '',
    )}</div></section><section><div class="section-title">${icon('bolt')}<h2>${t('ENERJİ & ELEKTRİK', 'ENERGY & ELECTRICITY')}</h2></div><div class="form-grid"><label>${t('Güç kaynağı', 'Power source')}<select name="powerMode"><option value="estimate" ${settings.powerMode === 'estimate' ? 'selected' : ''}>${t('Yük profili · tahmin', 'Load profile · estimate')}</option><option value="shelly" ${settings.powerMode === 'shelly' ? 'selected' : ''}>Shelly Gen2/Gen3 · ${t('ölçüm', 'meter')}</option></select></label><label>${t('Güç ölçer yerel IP', 'Power meter local IP')}<input name="meterHost" value="${e(settings.meterHost)}" placeholder="192.168.1.50" maxlength="15"></label><label>${t('Boşta güç (W)', 'Idle power (W)')}<input name="idleWatts" type="number" min="0" max="10000" step="1" value="${settings.idleWatts}"></label><label>${t('Yoğun yük (W)', 'Full load (W)')}<input name="maxWatts" type="number" min="0" max="20000" step="1" value="${settings.maxWatts}"></label><div class="automatic-price"><span>${t('Otomatik elektrik tarifesi', 'Automatic electricity tariff')}</span><strong>${settings.tariff === null ? t('Şehir / ilçe ile kurulacak', 'Set up with city / district') : money(settings.tariff) + ' / kWh'}</strong></div></div><p class="microcopy">${t('Yük profili priz ölçümü değildir; GPU, ekran ve PSU kayıpları ayrıca değişebilir. Varsayılan 65–350 W profilini cihazına göre ayarla. Shelly, yalnızca PC’nin bağlı olduğu prizi ölçmelidir.', 'A load profile is not a wall measurement; GPU, monitor and PSU losses vary. Calibrate the default 65–350 W profile. Connect only the PC to the metered outlet.')}</p><p class="microcopy">${t('Tarife değişikliği sonraki örneklere uygulanır. Tüketim yalnızca açıkken takip edilir; bu tutar toplam ev faturası değildir.', 'Tariff changes apply to future samples. Only running time is tracked; this is not your total household bill.')}</p></section><section><div class="section-title">${icon('wifi')}<h2>${t('BAĞLANTI', 'CONNECTION')}</h2></div><div class="form-grid"><label>${t('Ağ adaptörü', 'Network adapter')}<select name="networkInterface"><option value="auto">${t('Otomatik · varsayılan rota', 'Automatic · default route')}</option>${(snapshot?.network.interfaces ?? []).map((n) => `<option value="${e(n.id)}" ${n.id === settings.networkInterface ? 'selected' : ''}>${e(n.name)}</option>`).join('')}</select></label><label>${t('Ping hedefi', 'Ping target')}<input name="pingHost" value="${e(settings.pingHost)}" maxlength="253" required></label></div><p class="microcopy">${t('Hızlar adaptördeki mevcut trafiktir. İnternet paketinin azami hızını ölçen bir speedtest değildir. Ping seçili hedefi kontrol eder; engellenen ICMP yanıtları bağlantı sorunu gibi görünebilir.', 'Rates show current adapter traffic, not your plan’s maximum speed. Ping checks the selected target; blocked ICMP replies can appear as a connectivity issue.')}</p></section><section><div class="section-title">${icon('gear')}<h2>${t('GÖRÜNÜM & DAVRANIŞ', 'APPEARANCE & BEHAVIOR')}</h2></div><div class="form-grid"><label>${t('Dil', 'Language')}<select name="language"><option value="tr" ${settings.language === 'tr' ? 'selected' : ''}>Türkçe</option><option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option></select></label><label>${t('Ekran', 'Display')}<select name="displayId"><option value="auto">${t('Birincil ekran', 'Primary display')}</option>${info.displays.map((d) => `<option value="${d.id}" ${d.id === settings.displayId ? 'selected' : ''}>${e(d.label)}</option>`).join('')}</select></label><label>${t('Üst boşluk (px)', 'Top offset (px)')}<input name="topOffset" type="number" min="0" max="300" value="${settings.topOffset}"></label></div><div class="check-options"><label><input type="checkbox" name="alwaysOnTop" ${settings.alwaysOnTop ? 'checked' : ''}>${t('Diğer pencerelerin üzerinde tut', 'Keep on top')}</label><label><input type="checkbox" name="launchAtLogin" ${settings.launchAtLogin ? 'checked' : ''}>${t('Oturum açıldığında başlat', 'Launch at login')}</label><label><input type="checkbox" name="reducedMotion" ${settings.reducedMotion ? 'checked' : ''}>${t('Hareketleri azalt', 'Reduce motion')}</label></div></section><section class="maintenance"><div class="section-title">${icon('shield')}<h2>${t('YEDEK & GÜNCELLEME', 'BACKUP & UPDATE')}</h2></div><div class="maintenance-buttons"><button type="button" data-action="backup">${t('Yedek al', 'Export backup')}</button><button type="button" data-action="restore">${t('Geri yükle', 'Restore')}</button><button type="button" data-action="csv">CSV</button></div><p class="microcopy">${t('Verilerin bu cihazda saklanır. Ayar değişikliklerinde ve çıkışta otomatik yedek alınır; son 14 yedek korunur.', 'Your data stays on this device. Settings changes and shutdown create backups; the last 14 are retained.')}</p><div class="version-row"><span>Cortexia Island <b>v${e(info.version)}</b></span><button type="button" data-action="update" data-update-button>${t('Güncelleme ara', 'Check updates')}</button></div><p class="microcopy" data-update-status></p></section><div class="settings-end"><span>Ctrl / ⌘ + Shift + I · ${t('göster / gizle', 'show / hide')}</span><button type="button" data-action="hide">${t('Gizle', 'Hide')}</button><button type="button" data-action="quit">${t('Çıkış', 'Quit')}</button></div></form><div class="settings-save"><div class="form-feedback" role="status" data-feedback></div><button class="primary-button" form="settings-form" type="submit">${t('Değişiklikleri kaydet', 'Save changes')}</button></div></main>`;
}
const downHistory: number[] = [];
const upHistory: number[] = [];
function plot(values: number[], key: string) {
  const max = Math.max(1, ...values);
  const padded = [...Array(Math.max(0, 30 - values.length)).fill(0), ...values].slice(-30);
  const d = padded
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${((i * 220) / 29).toFixed(1)} ${(28 - (v / max) * 24).toFixed(1)}`,
    )
    .join(' ');
  root.querySelector(`[data-spark="${key}"]`)?.setAttribute('d', d);
}
function paint() {
  if (!snapshot) return;
  const n = snapshot.network;
  const p = snapshot.power;
  const day = snapshot.today;
  setText('down', fmt(n.downBps === null ? null : (n.downBps * 8) / 1e6));
  setText('up', fmt(n.upBps === null ? null : (n.upBps * 8) / 1e6));
  setText('ping', fmt(n.pingMs, 0));
  setText('jitter', fmt(n.jitterMs, 1));
  setText('loss', fmt(n.loss, 0));
  setText('watts', fmt(p.watts, 1));
  setText('source', p.source === 'meter' ? t('ÖLÇÜM', 'METER') : t('TAHMİN', 'ESTIMATE'));
  setText('compact-source', p.source === 'estimate' ? '≈' : '');
  setText(
    'power-note',
    !p.available
      ? t(
          'Güç ölçere ulaşılamıyor; tüketim kaydı durdu.',
          'Meter unavailable; energy tracking paused.',
        )
      : p.source === 'meter'
        ? t('PC prizindeki güç ölçerden okunuyor', 'Reading from your PC outlet meter')
        : t(
            'CPU yükü × ayarladığın güç profili · tahmini değer',
            'CPU load × your power profile · estimated value',
          ),
  );
  setText('energy', fmt((day.estimatedWh + day.measuredWh) / 1000, 3));
  const priced = day.pricedWh > 0 || settings.tariff !== null;
  setText('hero-cost', priced ? money(day.cost) : '—');
  setText('compact-cost', priced ? money(day.cost) : t('Tarife ekle', 'Set tariff'));
  setText(
    'hourly-cost',
    settings.tariff !== null && p.watts !== null && p.available
      ? money((p.watts / 1000) * settings.tariff)
      : '—',
  );
  setText(
    'cost',
    day.pricedWh > 0
      ? money(day.cost)
      : settings.tariff === null
        ? t('Tarife ekle', 'Set tariff')
        : money(0),
  );
  const unpriced = Math.max(0, day.estimatedWh + day.measuredWh - day.pricedWh);
  const boot = snapshot.boot;
  const sessionWh = boot ? boot.estimatedWh + boot.measuredWh : null;
  const sessionUnpriced = boot
    ? Math.max(0, boot.estimatedWh + boot.measuredWh - boot.pricedWh)
    : 0;
  const sessionPriced = boot && (boot.pricedWh > 0 || settings.tariff !== null);
  setText('session-energy', sessionWh === null ? '—' : fmt(sessionWh / 1000, 3));
  setText('hero-cost', sessionPriced ? money(boot!.cost) : '—');
  setText(
    'compact-cost',
    sessionPriced
      ? money(boot!.cost)
      : settings.tariff === null
        ? t('Tarife bul', 'Find tariff')
        : '—',
  );
  setText(
    'daily-summary',
    `${t('Bugün', 'Today')} · ${fmt((day.estimatedWh + day.measuredWh) / 1000, 3)} kWh · ${priced ? money(day.cost) : '—'}${unpriced > 0.1 ? ' · ' + fmt(unpriced / 1000, 3) + ' kWh ' + t('fiyatlandırılmadı', 'unpriced') : ''}`,
  );
  paintUsage('codex', snapshot.usage?.codex);
  paintUsage('claude', snapshot.usage?.claude);
  root
    .querySelector('.energy-bridge')
    ?.classList.toggle('paused', !p.available || p.watts === null);
  const electrical = p.source === 'meter' && p.available ? p.electrical : undefined;
  const protectionNames: Record<string, string> = {
    overtemp: t('Yüksek sıcaklık', 'Overtemperature'),
    overpower: t('Güç sınırı', 'Overpower'),
    overvoltage: t('Yüksek voltaj', 'Overvoltage'),
    undervoltage: t('Düşük voltaj', 'Undervoltage'),
    overcurrent: t('Yüksek akım', 'Overcurrent'),
  };
  setText(
    'health',
    !electrical
      ? t('Ölçer bağlı değil · veri yok', 'No meter reading available')
      : electrical.errors.length
        ? electrical.errors.map((code) => protectionNames[code] ?? code).join(' · ')
        : t('Ölçer koruma uyarısı bildirmiyor', 'Meter reports no protection alerts'),
  );
  for (const key of ['voltage', 'current', 'frequency', 'temperature', 'powerFactor'] as const)
    setText(key, fmt(electrical?.[key], key === 'current' || key === 'powerFactor' ? 2 : 1));
  setText(
    'average-power',
    day.trackedSeconds > 0
      ? `${fmt(((day.estimatedWh + day.measuredWh) * 3600) / day.trackedSeconds, 1)} W`
      : '—',
  );
  setText(
    'projection',
    p.available && p.watts !== null
      ? `${fmt(p.watts / 10, 2)} kWh${settings.tariff !== null ? ' · ' + money((p.watts / 10) * settings.tariff) : ''}`
      : '—',
  );
  setText(
    'tracked',
    `${t('Oturumda takip', 'Tracked this session')} ${fmt((boot?.trackedSeconds ?? 0) / 3600, 2)} ${t('sa', 'h')} · ${t('Yalnızca aktif ve okunabilen süre', 'Only active time with readings')}${settings.electricity.source === 'epdk' ? ' · ' + t('Standart tarife tahmini', 'Standard tariff estimate') : ''}${sessionUnpriced > 0.1 ? ' · ' + fmt(sessionUnpriced / 1000, 3) + ' kWh ' + t('fiyatlandırılmadı', 'unpriced') : ''}`,
  );
  const status = {
    online: t('Hedef erişilebilir', 'Target reachable'),
    degraded: t('Yanıtlar zayıf', 'Degraded replies'),
    offline: t('Adaptör kapalı', 'Adapter offline'),
    checking: t('Kontrol ediliyor', 'Checking'),
  }[n.status];
  setText('status', status);
  root
    .querySelectorAll<HTMLElement>('[data-status]')
    .forEach((el) => (el.dataset.status = n.status));
  setText(
    'probe',
    `${n.interface || t('Adaptör yok', 'No adapter')} · ${n.probe} · ${t('son 20 sorgu', 'last 20 probes')}`,
  );
  setText(
    'footer',
    `${t('CANLI', 'LIVE')} · ${new Date(snapshot.time).toLocaleTimeString(settings.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
  );
  setText('system', `CPU ${fmt(snapshot.cpu, 0)}% · RAM ${fmt(snapshot.memoryPercent, 0)}%`);
  setText('compact-cpu', fmt(snapshot.cpu, 0));
  setText('compact-battery', snapshot.battery.hasBattery ? fmt(snapshot.battery.percent, 0) : '—');
  setText(
    'battery',
    snapshot.battery.hasBattery
      ? `${fmt(snapshot.battery.percent, 0)}% · ${snapshot.battery.charging ? t('Şarj oluyor', 'Charging') : t('Pil kullanılıyor', 'On battery')}`
      : t('Bu cihazda batarya yok', 'No battery on this device'),
  );
  setText(
    'clock',
    new Date(snapshot.time).toLocaleTimeString(settings.language, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
  const fill = root.querySelector<HTMLElement>('[data-power-fill]');
  if (fill)
    fill.style.width = `${p.watts === null ? 0 : Math.min(100, (100 * p.watts) / settings.maxWatts)}%`;
  plot(downHistory, 'down');
  plot(upHistory, 'up');
  const error = root.querySelector<HTMLElement>('[data-error]');
  if (error) {
    error.hidden = !snapshot.error && !info.backupRecovered;
    error.textContent = snapshot.error
      ? t(
          'Bazı okumalar kullanılamıyor. Ayarlardaki kaynakları kontrol et.',
          'Some readings are unavailable. Check sources in Settings.',
        )
      : info.backupRecovered
        ? t(
            'Verilerin sağlam yerel yedekten kurtarıldı.',
            'Your data was recovered from a valid local backup.',
          )
        : '';
  }
  const hist = root.querySelector<HTMLElement>('[data-history]');
  if (hist) {
    const days = snapshot.history.slice(-7);
    const max = Math.max(1, ...days.map((d) => d.estimatedWh + d.measuredWh));
    hist.innerHTML = days.length
      ? days
          .map(
            (d) =>
              `<div class="history-row"><span>${e(d.date.slice(5))}</span><div class="history-bar"><i style="width:${(100 * d.estimatedWh) / max}%"></i><b style="width:${(100 * d.measuredWh) / max}%"></b></div><strong>${fmt((d.estimatedWh + d.measuredWh) / 1000, 3)}<small> kWh</small></strong></div>`,
          )
          .join('')
      : `<p class="section-intro">${t('İlk tüketim örnekleri bekleniyor.', 'Waiting for the first energy samples.')}</p>`;
  }
  paintUpdate();
}
function paintUsage(id: 'codex' | 'claude', usage: UsageSample | undefined) {
  const status = usage?.status ?? 'unavailable';
  setText(
    id + '-status',
    status === 'ready'
      ? id === 'claude'
        ? 'CLAUDE CODE'
        : t('GÜNCEL', 'CURRENT')
      : status === 'checking'
        ? t('OKUNUYOR', 'CHECKING')
        : status === 'stale'
          ? t('ESKİ VERİ', 'STALE')
          : t('VERİ YOK', 'NO DATA'),
  );
  for (const key of ['fiveHour', 'weekly'] as const) {
    const w = usage?.[key];
    setText(`${id}-${key}`, w ? fmt(w.usedPercent, 0) + '%' : '—');
    const bar = root.querySelector<HTMLElement>(`[data-usage="${id}-${key}"]`);
    if (bar) {
      bar.classList.toggle('stale', status === 'stale');
      bar.classList.toggle('warning', (w?.usedPercent ?? 0) >= 85);
      if (w) bar.setAttribute('aria-valuenow', String(w.usedPercent));
      else bar.removeAttribute('aria-valuenow');
      bar.setAttribute(
        'aria-valuetext',
        w
          ? fmt(w.usedPercent, 0) + '% ' + t('kullanıldı', 'used')
          : t('Veri alınamadı', 'Unavailable'),
      );
      const fill = bar.querySelector<HTMLElement>('i');
      if (fill) fill.style.width = (w?.usedPercent ?? 0) + '%';
    }
    const remaining = w ? Math.ceil((w.resetsAt - Date.now()) / 60000) : 0;
    setText(
      `${id}-${key}-reset`,
      !w
        ? t('Bu pencere bildirilmedi', 'Window not reported')
        : remaining <= 0
          ? t(
              'Yenilenme zamanı geçti · yeni veri bekleniyor',
              'Reset passed · waiting for fresh data',
            )
          : t('Yenilenme: ', 'Resets: ') +
            new Date(w.resetsAt).toLocaleString(settings.language, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
    );
  }
  setText(
    id + '-checked',
    usage?.checkedAt
      ? `${id === 'codex' ? t('Resmî Codex arayüzü · 60 sn yenileme', 'Official Codex interface · 60s polling') : t('Claude Code durum bildirimi', 'Claude Code status report')} · ${t('Son veri', 'Last report')} ${new Date(usage.checkedAt).toLocaleTimeString(settings.language)}${status === 'stale' ? ' · ' + t('Güncelliği doğrulanmadı', 'Freshness not verified') : ''}`
      : id === 'claude'
        ? t(
            'Claude Code bağlantısı ve oturum açmış, çalışan Claude Code gerekir. Web/masaüstü kullanımını resmî sayfadan kontrol edebilirsin.',
            'Requires the bridge and running signed-in Claude Code. Check web/desktop usage on the official page.',
          )
        : t(
            'Codex CLI’de ChatGPT hesabınla oturum aç. API anahtarı kullanımında bu plan limitleri bulunmayabilir.',
            'Sign in to Codex CLI with ChatGPT. These plan windows may not exist for API-key usage.',
          ),
  );
}
function paintUpdate() {
  const label = root.querySelector<HTMLElement>('[data-update-status]');
  const btn = root.querySelector<HTMLElement>('[data-update-button]');
  if (!label || !btn) return;
  const texts = {
    idle: '',
    checking: t('Kontrol ediliyor…', 'Checking…'),
    available: `v${update.version} ${t('hazır', 'available')}`,
    current: t('En güncel sürüm kullanılıyor.', 'You are up to date.'),
    downloading: `${t('İndiriliyor', 'Downloading')} ${fmt(update.progress ?? 0, 0)}%`,
    ready: t('Güncelleme indirildi. Kurmaya hazır.', 'Update downloaded. Ready to install.'),
    error: t(
      'Güncelleme kontrolü şu anda yapılamadı. Kurulu sürümde tekrar dene.',
      'Updates are unavailable right now. Try again in the installed app.',
    ),
  };
  label.textContent = texts[update.phase];
  btn.textContent =
    update.phase === 'available'
      ? t('Güncellemeyi indir', 'Download update')
      : update.phase === 'ready'
        ? t('Kur ve yeniden başlat', 'Install and restart')
        : t('Güncelleme ara', 'Check updates');
}
async function switchView(next: View) {
  view = next;
  render();
  await api?.setView(next);
}
function insertPersonalization() {
  const appearance = root.querySelector('[name="language"]')?.closest('section');
  appearance?.insertAdjacentHTML(
    'afterbegin',
    `<div class="mode-onboarding"><h2>${t('Cortexia’yı nasıl kullanmak istersin?', 'How would you like to use Cortexia?')}</h2><p>${t('Görünümünü seç. Daha sonra bu bölümden değiştirebilirsin.', 'Choose your surface. You can change it here anytime.')}</p><div class="presentation-options">${(
      ['island', 'taskbar', 'app', 'both'] as const
    )
      .map((mode) => {
        const names = {
          island: t('Dinamik ada', 'Dynamic island'),
          taskbar:
            info.platform === 'win32'
              ? t('Yalnızca Windows bar', 'Windows bar only')
              : t('Yalnızca menü bar', 'Menu bar only'),
          app: t('Uygulama', 'Application'),
          both: t('Ada + bar', 'Island + bar'),
        };
        const descriptions = {
          island: t('Ekran kenarında küçük, hareketli ada', 'A small island at the screen edge'),
          taskbar: t(
            'Diğer pencereler kapalı · ayarlar sağ tıkla',
            'Other surfaces hidden · settings by right-click',
          ),
          app: t('Normal pencere ve görev çubuğu ikonu', 'A normal window and taskbar icon'),
          both: t('Ada ve canlı bar birlikte açık', 'Island and live bar together'),
        };
        return `<label><input type="radio" name="presentation" value="${mode}" ${settings.presentation === mode ? 'checked' : ''}><span><strong>${names[mode]}</strong><small>${descriptions[mode]}</small></span></label>`;
      })
      .join(
        '',
      )}</div><p class="microcopy">${t('Uygulama penceresine geçişte pencere biçimi yeniden başlatılarak uygulanır; verilerin korunur.', 'Switching native window frames restarts the app and preserves your data.')}</p></div>`,
  );
  const widgets = root.querySelector('#widget-list');
  widgets?.insertAdjacentHTML(
    'beforeend',
    `<div class="provider-setup"><h3>${t('Canlı hesap verisi', 'Live account data')}</h3><p class="microcopy">${t('Codex: oturum açmış yerel Codex CLI’den 60 saniyede bir ve bildirim geldiğinde. Claude: resmî Claude Code durum satırından; aktif kullanımdaki bildirimler anında, durum satırı 15 saniyede bir alınır. Claude web/masaüstüne ait yeni kullanım ancak Claude Code bunu bildirdiğinde çubuğa yansır.', 'Codex: signed-in local CLI, every 60 seconds and on notifications. Claude: documented Claude Code status line; usage reports are immediate, status-line input is received every 15 seconds. New web/desktop use appears when Claude Code reports it.')}</p><div class="maintenance-buttons"><button type="button" data-action="claude-connect">${t('Claude Code’u bağla', 'Connect Claude Code')}</button><button type="button" data-action="claude-disconnect">${t('Bağlantıyı kaldır', 'Remove bridge')}</button><button type="button" data-action="usage-refresh">${t('Limitleri yenile', 'Refresh limits')}</button></div></div>`,
  );
  root
    .querySelector('.check-options')
    ?.insertAdjacentHTML(
      'beforebegin',
      `<div class="form-grid"><label>${t('Küçültülmüş görünüm', 'Collapsed appearance')}<select name="compactMode">${(['auto', 'metrics', 'droplet'] as const).map((mode) => `<option value="${mode}" ${mode === settings.compactMode ? 'selected' : ''}>${mode === 'auto' ? t('Otomatik · Mac damla / Windows veri', 'Automatic · Mac droplet / Windows metrics') : mode === 'droplet' ? t('Damla', 'Droplet') : t('Ortalanmış veriler', 'Centered metrics')}</option>`).join('')}</select></label></div>${`<section class="taskbar-settings"><h2>${info.platform === 'darwin' ? t('MENÜ ÇUBUĞU · CANLI GÖSTERGE', 'MENU BAR · LIVE INDICATOR') : t('GÖREV ÇUBUĞU · CANLI GÖSTERGE', 'TASKBAR · LIVE INDICATOR')}</h2><label class="clickthrough-option"><input type="checkbox" name="taskbarEnabled" ${settings.taskbar.enabled ? 'checked' : ''}>${info.platform === 'darwin' ? t('Menü çubuğunda göster', 'Show in the menu bar') : t('Sol alt görev çubuğunda göster', 'Show in the lower left taskbar area')}</label><p class="microcopy">${info.platform === 'darwin' ? t('Bir veya iki veri seç. Menü çubuğunda uygulama simgesinin yanında gösterilir.', 'Choose one or two readings beside the menu-bar icon.') : t('Bir veya iki veri seç. Cortexia bağımsız bir gösterge açar; Windows hava durumu düğmesini değiştirmez. Gizlenebilir. Otomatik gizlenen görev çubuğunda görünmez.', 'Select one or two metrics. Cortexia opens an independent indicator; it does not replace the Windows weather button. You can hide it. It stays hidden with an auto-hiding taskbar.')}</p><label class="clickthrough-option"><input type="checkbox" name="taskbarRotate" ${settings.taskbar.rotate ? 'checked' : ''}>${t('10 saniyelik döngü · elektrik → Codex → Claude', '10-second cycle · energy → Codex → Claude')}</label><p class="microcopy">${t('Her grupta iki veri görünür. Windows göstergesinin üzerine mouse ile gelince bekler; ayrılınca devam eder. Döngüyü kapatırsan aşağıdaki sabit veriler gösterilir.', 'Each group shows two readings. Hover the Windows indicator to pause; leave to resume. Disable the cycle to use the fixed metrics below.')}</p><div class="taskbar-options">${(Object.keys(taskbarLabels) as TaskbarMetric[]).map((metric) => `<label><input type="checkbox" name="taskbarMetric" value="${metric}" ${settings.taskbar.metrics.includes(metric) ? 'checked' : ''}>${t(...taskbarLabels[metric])}</label>`).join('')}</div></section>`}`,
    );
  root
    .querySelector('.check-options')
    ?.insertAdjacentHTML(
      'beforeend',
      `<label><input type="checkbox" name="snapToEdge" ${settings.snapToEdge ? 'checked' : ''}>${t('Üst kenara yaklaşınca birleştir · tüm monitörlerde', 'Snap to the top edge · on any display')}</label>`,
    );
  root
    .querySelector('.check-options')
    ?.insertAdjacentHTML(
      'beforebegin',
      `<div class="personalization"><label class="opacity-label">${t('Saydamlık', 'Opacity')}<span><input type="range" name="opacity" min="0.2" max="1" step="0.05" value="${settings.opacity}"><output>${Math.round(settings.opacity * 100)}%</output></span></label><label class="clickthrough-option"><input type="checkbox" name="clickThrough" ${settings.clickThrough ? 'checked' : ''}>${t('Tıklamaları alttaki pencereye geçir', 'Pass clicks to the window below')}</label><p class="microcopy">${t('Başlıktan sürükleyerek yer değiştir; konumun hatırlanır. Tamamen gizlemek için göz düğmesini kullan. Tıklama geçişinden çıkmak için tepsiye tıkla veya Ctrl/⌘+Shift+I kullan.', 'Drag the header to move; your position is remembered. Use the eye button to hide completely. Click the tray or press Ctrl/⌘+Shift+I to exit click-through mode.')}</p><button class="secondary-button" type="button" data-action="center">${t('Üst ortaya geri getir', 'Reset to top center')}</button></div>`,
    );
  const range = root.querySelector<HTMLInputElement>('input[name="opacity"]');
  range?.addEventListener('input', () => {
    const output = root.querySelector('.opacity-label output');
    if (output) output.textContent = `${Math.round(Number(range.value) * 100)}%`;
  });
}
function feedback(message: string, bad = false) {
  let el = root.querySelector<HTMLElement>('[data-feedback]');
  if (!el) {
    root
      .querySelector('.island')
      ?.insertAdjacentHTML(
        'beforeend',
        '<p class="action-feedback" data-feedback role="status"></p>',
      );
    el = root.querySelector<HTMLElement>('[data-feedback]');
  }
  if (el) {
    el.textContent = message;
    el.classList.toggle('bad', bad);
  }
}
async function action(name: string) {
  try {
    if (name === 'skip-tariff') {
      settings = await api!.saveSettings({
        ...settings,
        electricity: { ...settings.electricity, onboardingComplete: true },
      });
      return switchView('compact');
    }
    if (name === 'find-tariff') {
      const form = root.querySelector<HTMLFormElement>('#settings-form')!;
      const data = new FormData(form);
      const control = root.querySelector<HTMLButtonElement>('[data-action="find-tariff"]')!;
      const status = root.querySelector<HTMLElement>('[data-tariff-status]')!;
      control.disabled = true;
      status.textContent = t(
        'Resmî EPDK tablosu kontrol ediliyor…',
        'Checking the official EPDK table…',
      );
      try {
        const result = await api!.findTariff({
          city: String(data.get('tariffCity')),
          district: String(data.get('tariffDistrict')),
          subscription: 'residential',
          tier: 'low',
        });
        settings = result.settings;
        render();
        const note = root.querySelector<HTMLElement>('[data-tariff-status]');
        if (note)
          note.textContent += ` · ${money(result.quote.price)} / kWh · ${t('Uygulandı', 'Applied')}`;
      } catch (error) {
        status.textContent =
          error instanceof Error
            ? error.message.replace(/^Error invoking remote method 'tariff:find': Error: /, '')
            : t('Tarife bulunamadı. Tekrar dene.', 'Could not retrieve tariff. Retry.');
      } finally {
        control.disabled = false;
      }
      return;
    }
    if (name === 'tariff') {
      settingsTab = 'energy';
      await switchView('settings');
      const input = root.querySelector<HTMLSelectElement>('select[name="tariffCity"]');
      input?.closest('section')?.scrollIntoView({ block: 'start' });
      input?.focus();
      return;
    }
    if (name === 'expand') return switchView('expanded');
    if (name === 'usage-refresh') return api?.refreshUsage();
    if (name === 'codex-usage-page' || name === 'claude-usage-page')
      return api?.openUsagePage(name.startsWith('codex') ? 'codex' : 'claude');
    if (name === 'claude-connect') {
      const connected = await api?.connectClaude();
      feedback(
        connected
          ? t(
              'Claude Code bağlantısı kuruldu. Claude Code açık ve oturum açmışken resmî kullanım verisi gelir.',
              'Claude Code bridge installed. Usage arrives while signed in and running.',
            )
          : t('Bu bağlantıyı kurulu uygulamadan yapabilirsin.', 'Connect from the installed app.'),
      );
      return;
    }
    if (name === 'claude-disconnect') {
      await api?.disconnectClaude();
      feedback(t('Claude Code durum satırı geri yüklendi.', 'Claude Code status line restored.'));
      return;
    }
    if (name === 'compact')
      return settings.presentation === 'app' ? api?.minimize() : switchView('compact');
    if (name === 'settings' || name === 'widgets') {
      settingsTab = name === 'widgets' ? 'widgets' : 'general';
      await switchView('settings');
      return;
    }
    if (name === 'history') {
      showHistory = !showHistory;
      render();
      return;
    }
    if (name === 'hide') return api?.hide();
    if (name === 'quit') return api?.quit();
    if (name === 'center') {
      await api?.center();
      settings.position = null;
      return;
    }
    if (name === 'backup')
      feedback(
        (await api?.exportBackup())
          ? t('Yedek kaydedildi.', 'Backup saved.')
          : t('İşlem iptal edildi.', 'Canceled.'),
      );
    if (name === 'restore') await api?.importBackup();
    if (name === 'csv')
      feedback(
        (await api?.exportCsv())
          ? t('CSV kaydedildi.', 'CSV saved.')
          : t('İşlem iptal edildi.', 'Canceled.'),
      );
    if (name === 'update') {
      if (update.phase === 'available') await api?.downloadUpdate();
      else if (update.phase === 'ready') await api?.installUpdate();
      else await api?.checkUpdate();
    }
  } catch {
    feedback(
      t(
        'İşlem tamamlanamadı. Ayarları ve dosya erişimini kontrol et.',
        'Could not complete the action. Check settings and file access.',
      ),
      true,
    );
  }
}
function tariffSetupHtml() {
  const p = settings.electricity;
  return `<section class="tariff-setup"><div class="section-title">${icon('bolt')}<h2>${t('ELEKTRİK TARİFENİ BULALIM', 'FIND YOUR ELECTRICITY TARIFF')}</h2></div><p class="section-intro">${t('Sadece şehir ve ilçeni gir. Resmî standart mesken tarifesini çevrimiçi bulup uygulayalım.', 'Enter only your city and district. We will retrieve and apply the official standard residential tariff online.')}</p><div class="form-grid"><label>${t('Şehir · Türkiye', 'City · Türkiye')}<select name="tariffCity"><option value="">${t('Şehir seç', 'Choose city')}</option>${[
    ...TURKEY_CITIES,
  ]
    .sort((a, b) => a.localeCompare(b, 'tr'))
    .map((c) => `<option ${c === p.city ? 'selected' : ''}>${e(c)}</option>`)
    .join(
      '',
    )}</select></label><label>${t('İlçe', 'District')}<input name="tariffDistrict" maxlength="60" value="${e(p.district)}" placeholder="${t('İlçe adı', 'District name')}"></label></div><p class="microcopy">${t('Şehir/ilçe cihazında kalır. Ulusal mesken düşük kademe tarifesi kullanılır; evindeki sözleşme ve toplam tüketim bilinmediği için maliyet standart tarife tahminidir.', 'Location stays local. The national residential lower tier is used; without your household contract and total consumption, cost is a standard-tariff estimate.')}</p><button type="button" class="primary-button" data-action="find-tariff">${t('Tarifeyi otomatik bul ve uygula', 'Find and apply tariff automatically')}</button><p class="microcopy" data-tariff-status role="status">${p.source === 'epdk' ? e('EPDK · ' + money(settings.tariff!) + ' / kWh · ' + t('Vergiler dahil · Geçerli: ', 'Taxes included · Effective: ') + p.effectiveDate + ' · ' + t('Kontrol: ', 'Checked: ') + new Date(p.checkedAt!).toLocaleDateString(settings.language)) : t('Birim fiyat girmen gerekmiyor. Kaynak ve geçerlilik tarihi otomatik gösterilir.', 'No unit price input needed. Source and effective date will appear automatically.')}</p><button type="button" class="subtle-button" data-action="skip-tariff">${t('Şimdilik geç', 'Skip for now')}</button></section>`;
}
function bindSettings() {
  const form = root.querySelector<HTMLFormElement>('#settings-form')!;
  root.querySelectorAll<HTMLButtonElement>('[data-reorder]').forEach((el) =>
    el.addEventListener('click', () => {
      const row = el.closest('.widget-option')!;
      const previous = row.previousElementSibling;
      if (previous) row.parentElement!.insertBefore(row, previous);
      root
        .querySelectorAll<HTMLButtonElement>('[data-reorder]')
        .forEach((button, i) => (button.disabled = i === 0));
    }),
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const num = (key: string) => Number(data.get(key));
    const next: Settings = {
      ...settings,
      electricity: {
        ...settings.electricity,
        city: String(data.get('tariffCity') ?? settings.electricity.city),
        district: String(data.get('tariffDistrict') ?? settings.electricity.district).trim(),
        subscription: (data.get('tariffSubscription') ??
          settings.electricity.subscription) as Settings['electricity']['subscription'],
        tier: (data.get('tariffTier') ??
          settings.electricity.tier) as Settings['electricity']['tier'],
        onboardingComplete: true,
      },
      widgets: data.getAll('widget') as WidgetId[],
      presentation: data.get('presentation') as Settings['presentation'],
      presentationSetupComplete: true,
      startupConfigured: true,
      compactMode: data.get('compactMode') as Settings['compactMode'],
      taskbar: {
        enabled: data.has('taskbarEnabled'),
        metrics: data.getAll('taskbarMetric') as TaskbarMetric[],
        rotate: data.has('taskbarRotate'),
      },
      language: data.get('language') as Settings['language'],
      currency: settings.currency,
      powerMode: data.get('powerMode') as Settings['powerMode'],
      meterHost: String(data.get('meterHost')).trim(),
      idleWatts: num('idleWatts'),
      maxWatts: num('maxWatts'),
      tariff: settings.tariff,
      networkInterface: String(data.get('networkInterface')),
      pingHost: String(data.get('pingHost')).trim(),
      topOffset: num('topOffset'),
      displayId: data.get('displayId') === 'auto' ? null : num('displayId'),
      alwaysOnTop: data.has('alwaysOnTop'),
      launchAtLogin: data.has('launchAtLogin'),
      reducedMotion: data.has('reducedMotion'),
      opacity: num('opacity'),
      snapToEdge: data.has('snapToEdge'),
      clickThrough: data.has('clickThrough'),
    };
    if (!next.widgets.length) {
      feedback(t('En az bir widget seç.', 'Choose at least one widget.'), true);
      return;
    }
    if (next.taskbar.metrics.length < 1 || next.taskbar.metrics.length > 2) {
      feedback(
        t('Görev çubuğu için bir veya iki veri seç.', 'Choose one or two taskbar metrics.'),
        true,
      );
      return;
    }
    if (next.maxWatts < next.idleWatts) {
      feedback(
        t(
          'Yoğun yük gücü boşta güçten küçük olamaz.',
          'Full load power must be at least idle power.',
        ),
        true,
      );
      return;
    }
    try {
      settings = await api!.saveSettings(next);
      render();
      feedback(t('Ayarlar kaydedildi.', 'Settings saved.'));
    } catch {
      feedback(
        t(
          'Ayarlar geçersiz. Yerel IP’yi, ping hedefini ve sayıları kontrol et. Fiyatlandırılmış geçmiş varsa para birimi değiştirilemez.',
          'Invalid settings. Check local IP, ping target and values. Currency cannot change after priced history is recorded.',
        ),
        true,
      );
    }
  });
}
async function init() {
  if (window.islandTaskbar) {
    const taskApi = window.islandTaskbar;
    root.className = 'taskbar-root';
    let barState: Awaited<ReturnType<TaskbarAPI['getState']>> | null = null;
    let elapsed = 0,
      lastTick = performance.now(),
      paused = false;
    let lastPhase = '';
    root.addEventListener('pointerenter', () => {
      paused = true;
    });
    root.addEventListener('pointerleave', () => {
      paused = false;
      lastTick = performance.now();
    });
    const paintTaskbar = (state: Awaited<ReturnType<TaskbarAPI['getState']>>) => {
      if (barState?.settings.taskbar.rotate !== state.settings.taskbar.rotate) elapsed = 0;
      barState = state;
      settings = state.settings;
      const visibleMetrics = barMetrics(settings.taskbar, elapsed);
      lastPhase = visibleMetrics.join(',');
      const s = state.snapshot;
      const metric = (id: TaskbarMetric) => {
        if (!s) return '—';
        if (id === 'cost')
          return settings.tariff === null && s.today.pricedWh === 0
            ? t('Tarife kur', 'Set tariff')
            : money(s.today.cost);
        if (id === 'energy') return fmt((s.today.estimatedWh + s.today.measuredWh) / 1000, 3);
        if (id === 'power') return s.power.available ? fmt(s.power.watts, 1) : '—';
        if (id === 'ping') return fmt(s.network.pingMs, 0);
        if (id === 'sessionEnergy')
          return s.boot ? fmt((s.boot.estimatedWh + s.boot.measuredWh) / 1000, 3) : '—';
        if (id === 'sessionCost')
          return s.boot && (s.boot.pricedWh > 0 || settings.tariff !== null)
            ? money(s.boot.cost)
            : '—';
        if (id.startsWith('codex') || id.startsWith('claude')) {
          const usage = id.startsWith('codex') ? s.usage?.codex : s.usage?.claude;
          const w = id.endsWith('Week') ? usage?.weekly : usage?.fiveHour;
          return w ? (usage?.status === 'stale' ? '~' : '') + fmt(w.usedPercent, 0) + '%' : '—';
        }
        const bps = id === 'down' ? s.network.downBps : s.network.upBps;
        return fmt(bps === null ? null : (bps * 8) / 1e6, 1);
      };
      const uncertain = visibleMetrics.some((id) => {
        if (!id.startsWith('codex') && !id.startsWith('claude')) return !s;
        const u = id.startsWith('codex') ? s?.usage?.codex : s?.usage?.claude;
        const w = id.endsWith('Week') ? u?.weekly : u?.fiveHour;
        return !w || u?.status !== 'ready';
      });
      const barTitle =
        'Cortexia Island · ' +
        visibleMetrics.map((id) => t(...taskbarLabels[id]) + ': ' + metric(id)).join(' · ') +
        (uncertain
          ? ' · ' + t('Eksik veya güncelliği doğrulanmamış veri', 'Missing or unverified freshness')
          : '');
      const electricGroup =
        visibleMetrics.some((id) => id === 'cost' || id === 'sessionCost') &&
        visibleMetrics.some((id) => id === 'energy' || id === 'sessionEnergy');
      root.classList.toggle('reduced-motion', settings.reducedMotion);
      const layoutKey = lastPhase + ':' + settings.language + ':' + state.preview;
      if (root.dataset.barLayout !== layoutKey) {
        root.innerHTML = `<button class="taskbar-indicator" aria-label="Cortexia Island · ${t('Aç', 'Open')}" title="${e(barTitle)}"><img src="${brandMark}" alt=""><span class="taskbar-readings">${visibleMetrics.map((id) => `<span><strong data-taskbar="${id}">${e(metric(id))}</strong><small>${e(t(...taskbarLabels[id]))}</small></span>`).join(electricGroup ? `<b class="taskbar-electricity${s?.power.available ? '' : ' paused'}" aria-hidden="true">${icon('bolt')}</b>` : '')}</span>${state.preview ? '<span class="taskbar-demo">DEMO</span>' : `<i class="taskbar-live${uncertain ? ' uncertain' : ''}"></i>`}</button>`;
        root.querySelector('button')?.addEventListener('click', () => void taskApi.showIsland());
        root.dataset.barLayout = layoutKey;
      } else {
        root.querySelector<HTMLButtonElement>('button')!.title = barTitle;
        root.querySelectorAll<HTMLElement>('[data-taskbar]').forEach((el) => {
          el.textContent = metric(el.dataset.taskbar as TaskbarMetric);
        });
        root.querySelector('.taskbar-live')?.classList.toggle('uncertain', uncertain);
        root.querySelector('.taskbar-electricity')?.classList.toggle('paused', !s?.power.available);
      }
    };
    paintTaskbar(await taskApi.getState());
    taskApi.onState(paintTaskbar);
    setInterval(() => {
      const now = performance.now();
      if (!paused && barState?.settings.taskbar.rotate) elapsed += now - lastTick;
      lastTick = now;
      root.dataset.cycleState = paused ? 'paused' : 'running';
      root.dataset.cycleElapsed = String(Math.round(elapsed));
      if (barState && barMetrics(barState.settings.taskbar, elapsed).join(',') !== lastPhase)
        paintTaskbar(barState);
    }, 250);
    return;
  }
  if (!api) {
    root.className = 'browser-preview';
    root.innerHTML = `<main class="preview-note"><span class="lens"></span><h1>Cortexia Island</h1><p>Canlı sistem verileri masaüstü uygulamasında görüntülenir.</p><p>Live system readings are available in the desktop application.</p><code>npm run dev</code></main>`;
    return;
  }
  let initialLayout;
  [settings, info, snapshot, initialLayout] = await Promise.all([
    api.getSettings(),
    api.getInfo(),
    api.getSnapshot(),
    api.getLayout(),
  ]);
  docked = initialLayout.docked;
  view = info.initialView;
  if (view === 'settings')
    settingsTab = !settings.presentationSetupComplete
      ? 'general'
      : !settings.electricity.onboardingComplete
        ? 'energy'
        : 'general';
  render();
  if (view === 'settings' && settingsTab === 'energy' && !settings.electricity.onboardingComplete)
    root.querySelector<HTMLSelectElement>('[name="tariffCity"]')?.focus();
  api.onLayout((next) => {
    docked = next.docked;
    root.classList.toggle('edge-attached', docked && settings.presentation !== 'app');
  });
  api.onSnapshot((sample) => {
    snapshot = sample;
    if (sample.network.downBps !== null) {
      downHistory.push(sample.network.downBps);
      if (downHistory.length > 30) downHistory.shift();
    }
    if (sample.network.upBps !== null) {
      upHistory.push(sample.network.upBps);
      if (upHistory.length > 30) upHistory.shift();
    }
    paint();
  });
  api.onUpdate((status) => {
    update = status;
    paintUpdate();
  });
  api.onSettings((next) => {
    settings = next;
    if (view !== 'settings') render();
  });
  api.onOpenExpanded(() => void switchView('expanded'));
  api.onNavigate((next, section) => {
    showHistory = false;
    if (next === 'settings') settingsTab = section ?? 'general';
    void switchView(next);
  });
  let passthrough = false;
  document.addEventListener('pointermove', (event) => {
    if (resizingPointer || dropletPointer) return;
    const ignore = !(event.target instanceof Element && event.target.closest('.island'));
    if (ignore !== passthrough) {
      passthrough = ignore;
      void api.setPointerPassthrough(ignore);
    }
  });
  document.addEventListener('pointerleave', () => {
    if (resizingPointer || dropletPointer) return;
    passthrough = true;
    void api.setPointerPassthrough(true);
  });
  if (info.backupRecovered)
    feedback(t('Veriler yerel yedekten kurtarıldı.', 'Data recovered from a local backup.'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (view === 'settings') void switchView('expanded');
      else if (settings.presentation === 'app') void api.minimize();
      else void switchView('compact');
    }
  });
}
void init();
