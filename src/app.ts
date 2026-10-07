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
} from '../shared/types';
declare global {
  interface Window {
    island?: IslandAPI;
    __islandErrors?: string[];
  }
}
window.__islandErrors = [];
window.addEventListener('error', (e) => window.__islandErrors?.push(e.message));
window.addEventListener('unhandledrejection', (e) => window.__islandErrors?.push(String(e.reason)));
const api = window.island;
let resizingPointer = false;
const root = document.querySelector<HTMLDivElement>('#app')!;
let settings: Settings;
let snapshot: Snapshot | null = null;
let info: AppInfo;
let view: View = 'expanded';
let docked = true;
let showHistory = false;
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
};
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
  return `<section class="energy-card money-hero" data-widget-card="energy"><div class="money-heading"><span>${t('BUGÜNÜN TAHMİNİ MALİYETİ', 'ESTIMATED COST TODAY')}</span><span class="energy-tag">${icon('bolt')}${t('ELEKTRİK', 'ENERGY')}</span></div><div class="money-total" data-value="hero-cost">—</div><button class="tariff-cta" data-action="tariff" ${settings.tariff !== null ? 'hidden' : ''}>${t('Elektrik tarifeni ekle', 'Set your electricity tariff')}${icon('plus')}</button><div class="energy-summary"><div><span>${t('Takip edilen tüketim', 'Tracked energy')}</span><strong><span data-value="energy">—</span><small>kWh</small></strong></div><div><span>${t('Bu güçle saatlik tahmin', 'Estimated hourly at this power')}</span><strong data-value="hourly-cost">—</strong></div></div><p class="microcopy" data-value="tracked">${t('Yalnızca uygulama açıkken takip edilir', 'Tracked while running')}</p></section>`;
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
    return `<span class="compact-stat compact-money"><span class="compact-value"><strong data-value="compact-cost">—</strong></span><span class="compact-context">${t('BUGÜN', 'TODAY')}<span class="context-dot">·</span><b data-value="energy">—</b><span>kWh</span></span></span>`;
  if (id === 'system')
    return `<span class="compact-stat">${value('compact-cpu', '%', 'cpu')}<span class="compact-context">CPU</span></span>`;
  if (id === 'battery')
    return `<span class="compact-stat">${value('compact-battery', '%', 'battery')}<span class="compact-context">${t('BATARYA', 'BATTERY')}</span></span>`;
  return `<span class="compact-stat">${value('clock', '', 'clock')}<span class="compact-context">${t('YEREL SAAT', 'LOCAL TIME')}</span></span>`;
}
function render() {
  root.className = `view-${view}${settings.reducedMotion ? ' reduced-motion' : ''}${docked ? ' edge-attached' : ''}`;
  if (view === 'compact') {
    root.innerHTML = `<main class="island compact"><div class="compact-brand drag-area"><span class="lens"></span></div><button class="compact-readout" data-action="expand" aria-label="${t('Adayı genişlet', 'Expand island')}">${settings.widgets.slice(0, 2).map(compactWidget).join('<span class="compact-separator"></span>')}</button>${button('expand', t('Genişlet', 'Expand'), 'chevron')}</main>`;
  } else if (view === 'expanded') {
    root.innerHTML = `<main class="island expanded"><header><div class="brand drag-area"><span class="lens"></span><span>Cortexia <b>Island</b></span><span class="beta">${info.preview ? 'DEMO' : 'α'}</span></div><div class="header-controls">${button('settings', t('Ayarlar', 'Settings'), 'gear')}${button('compact', t('Küçült', 'Collapse'), 'minus')}</div></header><div class="scroll-body">${showHistory ? historyHtml() : settings.widgets.map((id) => (id === 'network' ? networkCard() : id === 'power' ? powerCard() : id === 'energy' ? energyCard() : smallCard(id))).join('')}</div><footer><span class="footer-status"><i class="status-dot" data-status></i><span data-value="footer">${t('Ölçüm başlıyor', 'Starting readings')}</span></span><div class="footer-actions">${button('history', t('Tüketim geçmişi', 'Energy history'), 'chart', showHistory ? 'active' : '')}${button('widgets', t('Widget ekle', 'Add widgets'), 'plus')}</div></footer><div class="error-banner" data-error hidden></div></main>`;
  } else {
    root.innerHTML = settingsHtml();
  }
  if (view === 'settings') {
    insertPersonalization();
    root.querySelector('#settings-form')?.insertAdjacentHTML('afterbegin', tariffSetupHtml());
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
  for (const corner of ['nw', 'ne', 'sw', 'se']) {
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
  return `<main class="island settings"><header><div class="brand drag-area"><span class="lens"></span><span>${t('Ada ayarları', 'Island settings')}</span></div>${button('expand', t('Geri dön', 'Go back'), 'close')}</header><form id="settings-form" class="scroll-body settings-body"><section id="widget-list"><div class="section-title">${icon('grid')}<h2>${t('ADANI OLUŞTUR', 'BUILD YOUR ISLAND')}</h2><span>${settings.widgets.length}/6</span></div><p class="section-intro">${t('İstediğin widget’ları ekle, sıralarını değiştir.', 'Choose your widgets and arrange their order.')}</p><div class="widget-list">${widgets
    .map((id) => {
      const c = catalog[id],
        idx = settings.widgets.indexOf(id);
      return `<div class="widget-option"><div class="widget-icon ${id}">${icon(c.icon)}</div><div class="widget-description"><strong>${t(...c.name)}</strong><span>${t(...c.description)}</span></div>${idx >= 0 ? `<button type="button" class="reorder" data-reorder="${id}" aria-label="${t('Yukarı taşı', 'Move up')}" ${idx === 0 ? 'disabled' : ''}>${icon('up')}</button>` : ''}<label class="switch"><input name="widget" type="checkbox" value="${id}" ${selected.has(id) ? 'checked' : ''} aria-label="${t(...c.name)}"><span></span></label></div>`;
    })
    .join(
      '',
    )}</div></section><section><div class="section-title">${icon('bolt')}<h2>${t('ENERJİ & ELEKTRİK', 'ENERGY & ELECTRICITY')}</h2></div><div class="form-grid"><label>${t('Güç kaynağı', 'Power source')}<select name="powerMode"><option value="estimate" ${settings.powerMode === 'estimate' ? 'selected' : ''}>${t('Yük profili · tahmin', 'Load profile · estimate')}</option><option value="shelly" ${settings.powerMode === 'shelly' ? 'selected' : ''}>Shelly Gen2/Gen3 · ${t('ölçüm', 'meter')}</option></select></label><label>${t('Güç ölçer yerel IP', 'Power meter local IP')}<input name="meterHost" value="${e(settings.meterHost)}" placeholder="192.168.1.50" maxlength="15"></label><label>${t('Boşta güç (W)', 'Idle power (W)')}<input name="idleWatts" type="number" min="0" max="10000" step="1" value="${settings.idleWatts}"></label><label>${t('Yoğun yük (W)', 'Full load (W)')}<input name="maxWatts" type="number" min="0" max="20000" step="1" value="${settings.maxWatts}"></label><label>${t('Birim fiyat / kWh', 'Price per kWh')}<input name="tariff" type="number" min="0" max="10000" step="0.0001" value="${settings.tariff ?? ''}" placeholder="${t('Faturandan gir', 'From your bill')}"></label><label>${t('Para birimi', 'Currency')}<select name="currency">${['TRY', 'USD', 'EUR'].map((c) => `<option ${c === settings.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div><p class="microcopy">${t('Yük profili priz ölçümü değildir; GPU, ekran ve PSU kayıpları ayrıca değişebilir. Varsayılan 65–350 W profilini cihazına göre ayarla. Shelly, yalnızca PC’nin bağlı olduğu prizi ölçmelidir.', 'A load profile is not a wall measurement; GPU, monitor and PSU losses vary. Calibrate the default 65–350 W profile. Connect only the PC to the metered outlet.')}</p><p class="microcopy">${t('Tarife değişikliği sonraki örneklere uygulanır. Tüketim yalnızca açıkken takip edilir; bu tutar toplam ev faturası değildir.', 'Tariff changes apply to future samples. Only running time is tracked; this is not your total household bill.')}</p></section><section><div class="section-title">${icon('wifi')}<h2>${t('BAĞLANTI', 'CONNECTION')}</h2></div><div class="form-grid"><label>${t('Ağ adaptörü', 'Network adapter')}<select name="networkInterface"><option value="auto">${t('Otomatik · varsayılan rota', 'Automatic · default route')}</option>${(snapshot?.network.interfaces ?? []).map((n) => `<option value="${e(n.id)}" ${n.id === settings.networkInterface ? 'selected' : ''}>${e(n.name)}</option>`).join('')}</select></label><label>${t('Ping hedefi', 'Ping target')}<input name="pingHost" value="${e(settings.pingHost)}" maxlength="253" required></label></div><p class="microcopy">${t('Hızlar adaptördeki mevcut trafiktir. İnternet paketinin azami hızını ölçen bir speedtest değildir. Ping seçili hedefi kontrol eder; engellenen ICMP yanıtları bağlantı sorunu gibi görünebilir.', 'Rates show current adapter traffic, not your plan’s maximum speed. Ping checks the selected target; blocked ICMP replies can appear as a connectivity issue.')}</p></section><section><div class="section-title">${icon('gear')}<h2>${t('GÖRÜNÜM & DAVRANIŞ', 'APPEARANCE & BEHAVIOR')}</h2></div><div class="form-grid"><label>${t('Dil', 'Language')}<select name="language"><option value="tr" ${settings.language === 'tr' ? 'selected' : ''}>Türkçe</option><option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option></select></label><label>${t('Ekran', 'Display')}<select name="displayId"><option value="auto">${t('Birincil ekran', 'Primary display')}</option>${info.displays.map((d) => `<option value="${d.id}" ${d.id === settings.displayId ? 'selected' : ''}>${e(d.label)}</option>`).join('')}</select></label><label>${t('Üst boşluk (px)', 'Top offset (px)')}<input name="topOffset" type="number" min="0" max="300" value="${settings.topOffset}"></label></div><div class="check-options"><label><input type="checkbox" name="alwaysOnTop" ${settings.alwaysOnTop ? 'checked' : ''}>${t('Diğer pencerelerin üzerinde tut', 'Keep on top')}</label><label><input type="checkbox" name="launchAtLogin" ${settings.launchAtLogin ? 'checked' : ''}>${t('Oturum açıldığında başlat', 'Launch at login')}</label><label><input type="checkbox" name="reducedMotion" ${settings.reducedMotion ? 'checked' : ''}>${t('Hareketleri azalt', 'Reduce motion')}</label></div></section><div class="form-feedback" role="status" data-feedback></div><button class="primary-button" type="submit">${t('Değişiklikleri kaydet', 'Save changes')}</button><section class="maintenance"><div class="section-title">${icon('shield')}<h2>${t('YEDEK & GÜNCELLEME', 'BACKUP & UPDATE')}</h2></div><div class="maintenance-buttons"><button type="button" data-action="backup">${t('Yedek al', 'Export backup')}</button><button type="button" data-action="restore">${t('Geri yükle', 'Restore')}</button><button type="button" data-action="csv">CSV</button></div><p class="microcopy">${t('Verilerin bu cihazda saklanır. Ayar değişikliklerinde ve çıkışta otomatik yedek alınır; son 14 yedek korunur.', 'Your data stays on this device. Settings changes and shutdown create backups; the last 14 are retained.')}</p><div class="version-row"><span>Cortexia Island <b>v${e(info.version)}</b></span><button type="button" data-action="update" data-update-button>${t('Güncelleme ara', 'Check updates')}</button></div><p class="microcopy" data-update-status></p></section><div class="settings-end"><span>Ctrl / ⌘ + Shift + I · ${t('göster / gizle', 'show / hide')}</span><button type="button" data-action="hide">${t('Gizle', 'Hide')}</button><button type="button" data-action="quit">${t('Çıkış', 'Quit')}</button></div></form></main>`;
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
  setText(
    'tracked',
    `${t('Takip', 'Tracked')} ${fmt(day.trackedSeconds / 3600, 2)} ${t('sa', 'h')}${unpriced > 0.1 ? ` · ${fmt(unpriced / 1000, 3)} kWh ${t('fiyatlandırılmadı', 'unpriced')}` : ''}`,
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
  const el = root.querySelector<HTMLElement>('[data-feedback]');
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
          subscription: data.get('tariffSubscription') as 'residential' | 'other',
          tier: data.get('tariffTier') as 'low' | 'high',
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
      await switchView('settings');
      const input = root.querySelector<HTMLSelectElement>('select[name="tariffCity"]');
      input?.closest('section')?.scrollIntoView({ block: 'start' });
      input?.focus();
      return;
    }
    if (name === 'expand') return switchView('expanded');
    if (name === 'compact') return switchView('compact');
    if (name === 'settings' || name === 'widgets') {
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
  return `<section class="tariff-setup"><div class="section-title">${icon('bolt')}<h2>${t('ELEKTRİK TARİFENİ BULALIM', 'FIND YOUR ELECTRICITY TARIFF')}</h2></div><p class="section-intro">${t('Şehir ve semtini seç. Desteklenen mesken tarifesini EPDK’dan çevrimiçi bulup uygulayalım.', 'Choose your city and district. We will retrieve and apply a supported residential tariff from EPDK.')}</p><div class="form-grid"><label>${t('Şehir · Türkiye', 'City · Türkiye')}<select name="tariffCity"><option value="">${t('Şehir seç', 'Choose city')}</option>${[
    ...TURKEY_CITIES,
  ]
    .sort((a, b) => a.localeCompare(b, 'tr'))
    .map((c) => `<option ${c === p.city ? 'selected' : ''}>${e(c)}</option>`)
    .join(
      '',
    )}</select></label><label>${t('İlçe / semt', 'District / neighborhood')}<input name="tariffDistrict" maxlength="60" value="${e(p.district)}" placeholder="${t('İlçe veya semt adı', 'District or neighborhood')}"></label><label>${t('Abonelik', 'Subscription')}<select name="tariffSubscription"><option value="residential" ${p.subscription === 'residential' ? 'selected' : ''}>${t('Mesken · ulusal · tek zamanlı', 'Residential · national · single rate')}</option><option value="other" ${p.subscription === 'other' ? 'selected' : ''}>${t('SKTT / özel / ticari / çok zamanlı', 'Special / commercial / time of use')}</option></select></label><label>${t('Ev tüketimi kademesi', 'Household consumption tier')}<select name="tariffTier"><option value="low" ${p.tier === 'low' ? 'selected' : ''}>${t('Düşük · günlük 8 kWh ve altı', 'Low · up to 8 kWh per day')}</option><option value="high" ${p.tier === 'high' ? 'selected' : ''}>${t('Yüksek · 8 kWh üstü bölüm', 'High · portion above 8 kWh')}</option></select></label></div><p class="microcopy">${t('Kademe tüm evin tüketimi içindir. Şehir/semt cihazında kalır; ulusal fiyat şehre göre değişmez. Özel aboneliklerde faturandaki fiyatı kullan.', 'The tier concerns your whole household. Location stays local; the national price does not vary by city. Use your invoice for special subscriptions.')}</p><button type="button" class="primary-button" data-action="find-tariff">${t('Çevrimiçi bul ve uygula', 'Find online and apply')}</button><p class="microcopy" data-tariff-status role="status">${p.source === 'epdk' ? e(t('EPDK · Vergiler dahil · Geçerli: ', 'EPDK · Taxes included · Effective: ') + p.effectiveDate + ' · ' + t('Kontrol: ', 'Checked: ') + new Date(p.checkedAt!).toLocaleDateString(settings.language)) : t('Kaynak, geçerlilik tarihi ve vergi dahil fiyat gösterilir.', 'Source, effective date and tax-inclusive price will be shown.')}</p><button type="button" class="subtle-button" data-action="skip-tariff">${t('Şimdilik geç', 'Skip for now')}</button></section>`;
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
      language: data.get('language') as Settings['language'],
      currency: data.get('currency') as Settings['currency'],
      powerMode: data.get('powerMode') as Settings['powerMode'],
      meterHost: String(data.get('meterHost')).trim(),
      idleWatts: num('idleWatts'),
      maxWatts: num('maxWatts'),
      tariff: data.get('tariff') === '' ? null : num('tariff'),
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
  render();
  if (view === 'settings' && !settings.electricity.onboardingComplete)
    root.querySelector<HTMLSelectElement>('[name="tariffCity"]')?.focus();
  api.onLayout((next) => {
    docked = next.docked;
    root.classList.toggle('edge-attached', docked);
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
  let passthrough = false;
  document.addEventListener('pointermove', (event) => {
    if (resizingPointer) return;
    const ignore = !(event.target instanceof Element && event.target.closest('.island'));
    if (ignore !== passthrough) {
      passthrough = ignore;
      void api.setPointerPassthrough(ignore);
    }
  });
  document.addEventListener('pointerleave', () => {
    if (resizingPointer) return;
    passthrough = true;
    void api.setPointerPassthrough(true);
  });
  if (info.backupRecovered)
    feedback(t('Veriler yerel yedekten kurtarıldı.', 'Data recovered from a local backup.'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') void switchView(view === 'settings' ? 'expanded' : 'compact');
  });
}
void init();
