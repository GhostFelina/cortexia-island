import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  dialog,
  powerMonitor,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { DataStore } from './store';
import { Telemetry } from './telemetry';
import { findOnlineTariff, validateTariffRequest } from './tariff';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  validateStore,
  emptyDay,
  localDate,
  locateDisplay,
} from './core';
import type { Snapshot, View, UpdateStatus } from '../shared/types';
const smoke = process.argv.includes('--smoke');
const captureLive = process.argv.includes('--capture-live');
if (smoke) app.setPath('userData', path.join(process.cwd(), '.artifacts', 'smoke-profile'));
const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else if (process.argv.includes('--quit')) {
  app.quit();
} else {
  let win: BrowserWindow;
  let taskbarWin: BrowserWindow | undefined;
  let taskbarAlignmentSupported = true;
  let tray: Tray;
  let store: DataStore;
  let telemetry: Telemetry;
  let view: View = smoke ? 'expanded' : 'compact';
  let update: UpdateStatus = { phase: 'idle' };
  let expectedPosition = { x: 0, y: 0 };
  let moveTimer: NodeJS.Timeout | undefined;
  let resizing: { corner: string; bounds: Electron.Rectangle; cursor: Electron.Point } | undefined;
  const root = path.join(__dirname, '..', '..');
  const heights: Record<View, number> = { compact: 68, expanded: 600, settings: 760 };
  let layout = { docked: true };
  function emitLayout(bounds = win.getBounds()) {
    const area = screen.getDisplayMatching(bounds).workArea;
    layout = { docked: Math.abs(bounds.y - area.y) <= 1 };
    win.webContents.send('window:layout', layout);
  }
  function position() {
    const displays = screen.getAllDisplays();
    const saved = store.data.settings.position;
    const droplet =
      view === 'compact' &&
      (store.data.settings.compactMode === 'droplet' ||
        (store.data.settings.compactMode === 'auto' && process.platform === 'darwin'));
    const size = droplet ? { width: 88, height: 84 } : store.data.settings.sizes[view];
    const display = locateDisplay(
      displays,
      saved
        ? {
            ...saved,
            width: size?.width ?? (view === 'compact' ? 440 : 560),
            height: size?.height ?? heights[view],
          }
        : null,
      store.data.settings.displayId ?? screen.getPrimaryDisplay().id,
    );
    const area = display.workArea;
    const width = Math.min(size?.width ?? (view === 'compact' ? 440 : 560), area.width);
    const height = Math.min(size?.height ?? heights[view], area.height);
    const x = saved
      ? Math.max(area.x, Math.min(saved.x, area.x + area.width - width))
      : Math.round(area.x + (area.width - width) / 2);
    const y = saved
      ? Math.max(area.y, Math.min(saved.y, area.y + area.height - height))
      : area.y + Math.min(store.data.settings.topOffset, Math.max(0, area.height - height));
    expectedPosition = { x, y };
    win.setBounds({ x, y, width, height });
    emitLayout({ x, y, width, height });
  }
  function emitUpdate(status: UpdateStatus) {
    update = status;
    if (win && !win.isDestroyed()) win.webContents.send('update:status', status);
  }
  function ensureSender(event: Electron.IpcMainInvokeEvent) {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
      throw new Error('Untrusted sender');
  }
  function register(channel: string, handler: (...args: any[]) => unknown) {
    ipcMain.handle(channel, (event, ...args) => {
      if (!win || win.isDestroyed()) return;
      ensureSender(event);
      return handler(...args);
    });
  }
  function emitSettings() {
    win.webContents.send('settings:changed', store.data.settings);
    publishTaskbar();
  }
  function applySettings() {
    win.setAlwaysOnTop(store.data.settings.alwaysOnTop, 'floating');
    win.setOpacity(store.data.settings.opacity);
    win.setIgnoreMouseEvents(store.data.settings.clickThrough, { forward: true });
    if (app.isPackaged && !smoke)
      app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtLogin });
    position();
    positionTaskbar();
  }
  function taskbarState() {
    return {
      settings: store.data.settings,
      snapshot: smoke ? fixture() : (telemetry?.last ?? null),
      preview: smoke,
    };
  }
  function publishTaskbar() {
    if (taskbarWin && !taskbarWin.isDestroyed())
      taskbarWin.webContents.send('taskbar:state', taskbarState());
    if (tray && telemetry?.last) {
      const s = telemetry.last;
      tray.setToolTip(
        `Cortexia Island · ${((s.today.estimatedWh + s.today.measuredWh) / 1000).toFixed(3)} kWh · ${store.data.settings.tariff === null ? 'Tarife kurulumu' : new Intl.NumberFormat(store.data.settings.language, { style: 'currency', currency: store.data.settings.currency }).format(s.today.cost)} · ${s.power.watts?.toFixed(1) ?? '—'} W`,
      );
      if (process.platform === 'darwin')
        tray.setTitle(
          store.data.settings.tariff === null
            ? '—'
            : new Intl.NumberFormat(store.data.settings.language, {
                style: 'currency',
                currency: store.data.settings.currency,
              }).format(s.today.cost),
        );
    }
  }
  function positionTaskbar() {
    if (!taskbarWin || taskbarWin.isDestroyed()) return;
    const display = screen.getPrimaryDisplay();
    const gap =
      display.bounds.y + display.bounds.height - display.workArea.y - display.workArea.height;
    if (
      process.platform !== 'win32' ||
      !taskbarAlignmentSupported ||
      display.bounds.width < 1024 ||
      !store.data.settings.taskbar.enabled ||
      gap < 28 ||
      gap > 120
    ) {
      taskbarWin.hide();
      return;
    }
    const height = Math.min(44, gap - 4);
    taskbarWin.setBounds({
      x: display.bounds.x + 8,
      y: display.workArea.y + display.workArea.height + Math.round((gap - height) / 2),
      width: 264,
      height,
    });
    taskbarWin.setAlwaysOnTop(true, 'pop-up-menu');
    taskbarWin.showInactive();
    publishTaskbar();
  }
  async function createTaskbar() {
    if (process.platform !== 'win32') return;
    // Read only: do not cover Start when the owner uses left-aligned buttons.
    const alignment = await new Promise<string>((resolve) =>
      execFile(
        'reg.exe',
        [
          'query',
          'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
          '/v',
          'TaskbarAl',
        ],
        { windowsHide: true, timeout: 3000 },
        (_error, stdout) => resolve(stdout ?? ''),
      ),
    );
    taskbarAlignmentSupported = !/TaskbarAl\s+REG_DWORD\s+0x0\b/i.test(alignment);
    taskbarWin = new BrowserWindow({
      width: 264,
      height: 44,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, 'taskbar-preload.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    taskbarWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    taskbarWin.webContents.on('will-navigate', (event) => event.preventDefault());
    const auth = (event: Electron.IpcMainInvokeEvent) => {
      if (
        event.sender !== taskbarWin!.webContents ||
        event.senderFrame !== taskbarWin!.webContents.mainFrame
      )
        throw new Error('Untrusted taskbar sender');
    };
    ipcMain.handle('taskbar:state', (event) => {
      auth(event);
      return taskbarState();
    });
    ipcMain.handle('taskbar:show', (event) => {
      auth(event);
      view = 'expanded';
      win.webContents.send('window:open-expanded');
      reveal();
    });
    if (process.env.ISLAND_DEV_URL && !app.isPackaged)
      await taskbarWin.loadURL(process.env.ISLAND_DEV_URL + '#taskbar');
    else await taskbarWin.loadFile(path.join(root, 'dist', 'index.html'), { hash: 'taskbar' });
    positionTaskbar();
    screen.on('display-metrics-changed', positionTaskbar);
    screen.on('display-added', positionTaskbar);
    screen.on('display-removed', positionTaskbar);
  }
  function reveal() {
    store.data.settings.clickThrough = false;
    store.save();
    applySettings();
    emitSettings();
    if (smoke) win.showInactive();
    else {
      win.show();
      win.focus();
    }
  }
  function fixture(): Snapshot {
    const today = {
      ...emptyDay(localDate(Date.now())),
      estimatedWh: 842,
      trackedSeconds: 14400,
      cost: 2.86,
      pricedWh: 842,
    };
    return {
      time: Date.now(),
      cpu: 24,
      memoryPercent: 42,
      network: {
        downBps: 1862500,
        upBps: 337500,
        interface: 'Demo adapter',
        interfaces: [{ id: 'Demo adapter', name: 'Demo adapter' }],
        pingMs: 12,
        jitterMs: 1.4,
        loss: 0,
        status: 'online',
        probe: '1.1.1.1',
      },
      power: { watts: 124.8, source: 'estimate', available: true },
      today,
      history: [{ ...today, date: localDate(Date.now() - 86400000), estimatedWh: 610 }, today],
      battery: { hasBattery: false, percent: null, charging: false },
      error: null,
    };
  }
  async function chooseExport(kind: 'backup' | 'csv') {
    const response = await dialog.showSaveDialog(win, {
      title: kind === 'csv' ? 'CSV dışa aktar' : 'Yedek oluştur',
      defaultPath: `Cortexia-Island-${localDate(Date.now())}.${kind === 'csv' ? 'csv' : 'json'}`,
      filters: [
        { name: kind === 'csv' ? 'CSV' : 'JSON', extensions: [kind === 'csv' ? 'csv' : 'json'] },
      ],
    });
    if (response.canceled || !response.filePath) return false;
    fs.writeFileSync(response.filePath, kind === 'csv' ? store.csv() : store.export(), 'utf8');
    return true;
  }
  async function createWindow() {
    store = new DataStore(app.getPath('userData'));
    if (
      !smoke &&
      store.data.settings.tariff === null &&
      !store.data.settings.electricity.onboardingComplete
    )
      view = 'settings';
    if (store.data.settings.widgets.join(',') === 'network,power,energy')
      store.data.settings.widgets = ['energy', 'power', 'network'];
    if (process.argv.includes('--dock')) {
      store.data.settings.position = null;
      store.data.settings.topOffset = 0;
    }
    if (smoke)
      store.data = {
        schemaVersion: 1,
        settings: { ...structuredClone(DEFAULT_SETTINGS), compactMode: 'metrics', tariff: 3.4 },
        days: [],
      };
    store.backup();
    store.save();
    win = new BrowserWindow({
      width: 560,
      height: heights[view],
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: false,
      skipTaskbar: false,
      title: 'Cortexia Island',
      icon: path.join(root, 'assets', 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    register('settings:get', () => store.data.settings);
    let tariffBusy = false;
    register('tariff:find', async (input: unknown) => {
      if (tariffBusy) throw new Error('Tarife sorgusu zaten sürüyor.');
      if (store.data.settings.currency !== 'TRY' && store.data.days.some((d) => d.pricedWh > 0))
        throw new Error('Fiyatlandırılmış geçmişin para birimi TRY değil. Manuel fiyat kullan.');
      const request = validateTariffRequest({
        ...(input as object),
        subscription: 'residential',
        tier: 'low',
      });
      tariffBusy = true;
      try {
        const quote = await findOnlineTariff(request);
        const settings = validateSettings({
          ...store.data.settings,
          currency: 'TRY',
          tariff: quote.price,
          electricity: {
            ...request,
            onboardingComplete: true,
            source: 'epdk',
            effectiveDate: quote.effectiveDate,
            checkedAt: quote.checkedAt,
          },
        });
        store.backup();
        store.data.settings = settings;
        store.save();
        telemetry.resetInterval();
        emitSettings();
        return { settings, quote };
      } finally {
        tariffBusy = false;
      }
    });
    register('settings:save', (input: unknown) => {
      const settings = validateSettings(input);
      if (
        settings.tariff !== store.data.settings.tariff ||
        settings.currency !== store.data.settings.currency ||
        settings.electricity.tier !== store.data.settings.electricity.tier ||
        settings.electricity.subscription !== store.data.settings.electricity.subscription
      )
        settings.electricity = {
          ...settings.electricity,
          source: 'manual',
          effectiveDate: null,
          checkedAt: null,
        };
      settings.position = store.data.settings.position;
      settings.sizes = store.data.settings.sizes;
      if (settings.displayId !== store.data.settings.displayId) settings.position = null;
      if (
        settings.currency !== store.data.settings.currency &&
        store.data.days.some((d) => d.pricedWh > 0)
      )
        throw new Error(
          'Currency is fixed after priced energy is recorded. Export your history first; create a new profile to change currency.',
        );
      store.backup();
      store.data.settings = settings;
      store.save();
      telemetry.resetInterval();
      applySettings();
      emitSettings();
      return settings;
    });
    register('telemetry:get', () => (smoke ? fixture() : telemetry.last));
    register('window:layout', () => layout);
    register('app:info', () => ({
      initialView: view,
      version: app.getVersion(),
      platform: process.platform,
      packaged: app.isPackaged,
      backupRecovered: store.recovered,
      preview: smoke,
      displays: screen
        .getAllDisplays()
        .map((d, i) => ({ id: d.id, label: d.label || `Display ${i + 1}` })),
    }));
    register('window:view', (input: unknown) => {
      if (!['compact', 'expanded', 'settings'].includes(String(input)))
        throw new Error('Invalid view');
      view = input as View;
      position();
    });
    register('window:hide', () => win.hide());
    register('window:resize', (corner: unknown, phase: unknown) => {
      if (
        typeof corner !== 'string' ||
        !['nw', 'ne', 'sw', 'se'].includes(corner) ||
        !['start', 'move', 'end'].includes(String(phase))
      )
        throw new Error('Invalid resize');
      if (phase === 'start') {
        if (moveTimer) clearTimeout(moveTimer);
        resizing = { corner, bounds: win.getBounds(), cursor: screen.getCursorScreenPoint() };
        return;
      }
      if (!resizing || resizing.corner !== corner) return;
      if (phase === 'move') {
        const cursor = screen.getCursorScreenPoint();
        const b = resizing.bounds;
        const dx = cursor.x - resizing.cursor.x;
        const dy = cursor.y - resizing.cursor.y;
        const area = screen.getDisplayMatching(b).workArea;
        const width = Math.round(
          Math.max(
            view === 'compact' ? 320 : 400,
            Math.min(1200, area.width, b.width + (corner.includes('w') ? -dx : dx)),
          ),
        );
        const height = Math.round(
          Math.max(
            view === 'compact' ? 56 : 260,
            Math.min(1200, area.height, b.height + (corner.includes('n') ? -dy : dy)),
          ),
        );
        const x = Math.max(
          area.x,
          Math.min(b.x + (corner.includes('w') ? b.width - width : 0), area.x + area.width - width),
        );
        const y = Math.max(
          area.y,
          Math.min(
            b.y + (corner.includes('n') ? b.height - height : 0),
            area.y + area.height - height,
          ),
        );
        win.setBounds({ x, y, width, height });
        emitLayout({ x, y, width, height });
      } else {
        const bounds = win.getBounds();
        store.data.settings.sizes[view] = { width: bounds.width, height: bounds.height };
        store.data.settings.position = { x: bounds.x, y: bounds.y };
        store.save();
        resizing = undefined;
        emitSettings();
        emitLayout(bounds);
      }
    });
    register('app:quit', () => app.quit());
    register('window:center', () => {
      store.data.settings.position = null;
      store.data.settings.topOffset = 0;
      store.save();
      position();
      emitSettings();
    });
    register('window:passthrough', (ignore: unknown) => {
      if (typeof ignore !== 'boolean') throw new Error('Invalid pointer state');
      win.setIgnoreMouseEvents(store.data.settings.clickThrough || ignore, { forward: true });
    });
    register('data:export', () => chooseExport('backup'));
    register('data:csv', () => chooseExport('csv'));
    register('data:import', async () => {
      const choice = await dialog.showOpenDialog(win, {
        title: 'Yerel yedeği geri yükle',
        properties: ['openFile'],
        filters: [{ name: 'Cortexia Island backup', extensions: ['json'] }],
      });
      if (choice.canceled || !choice.filePaths[0]) return false;
      if (fs.statSync(choice.filePaths[0]).size > 2 * 1024 * 1024)
        throw new Error('Backup is too large');
      const input = JSON.parse(fs.readFileSync(choice.filePaths[0], 'utf8'));
      // Validate before asking to replace the current profile.
      validateStore(input);
      const answer = await dialog.showMessageBox(win, {
        type: 'question',
        title: 'Yedeği geri yükle',
        message: 'Mevcut ayarlar ve tüketim geçmişi bu yedekle değiştirilsin mi?',
        detail: 'Mevcut verilerin otomatik yedeği tutulacak.',
        buttons: ['Vazgeç', 'Geri yükle'],
        defaultId: 0,
        cancelId: 0,
      });
      if (answer.response !== 1) return false;
      store.replace(input);
      telemetry.resetInterval();
      applySettings();
      win.webContents.reload();
      return true;
    });
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = true;
    autoUpdater.on('checking-for-update', () => emitUpdate({ phase: 'checking' }));
    autoUpdater.on('update-available', (info) =>
      emitUpdate({ phase: 'available', version: info.version }),
    );
    autoUpdater.on('update-not-available', () => emitUpdate({ phase: 'current' }));
    autoUpdater.on('download-progress', (p) =>
      emitUpdate({ phase: 'downloading', progress: p.percent }),
    );
    autoUpdater.on('update-downloaded', (info) =>
      emitUpdate({ phase: 'ready', version: info.version }),
    );
    autoUpdater.on('error', () =>
      emitUpdate({ phase: 'error', message: 'Update unavailable. Please try again later.' }),
    );
    register('update:check', async () => {
      if (!app.isPackaged) {
        emitUpdate({
          phase: 'error',
          message: 'Updates are available in the installed application.',
        });
        return;
      }
      try {
        await autoUpdater.checkForUpdates();
      } catch {
        emitUpdate({ phase: 'error' });
      }
    });
    register('update:download', async () => {
      if (update.phase !== 'available') return;
      try {
        await autoUpdater.downloadUpdate();
      } catch {
        emitUpdate({ phase: 'error' });
      }
    });
    register('update:install', async () => {
      if (update.phase !== 'ready') return;
      const result = await dialog.showMessageBox(win, {
        type: 'question',
        message: 'Güncelleme kurulup uygulama yeniden başlatılsın mı?',
        buttons: ['Vazgeç', 'Kur ve yeniden başlat'],
        defaultId: 0,
        cancelId: 0,
      });
      if (result.response === 1) {
        store.save();
        autoUpdater.quitAndInstall();
      }
    });
    const image = nativeImage.createFromPath(path.join(root, 'assets', 'tray.png'));
    tray = new Tray(image);
    tray.setToolTip('Cortexia Island');
    const show = reveal;
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Cortexia Island · Göster / etkileşimi aç', click: show },
        { label: 'Gizle', click: () => win.hide() },
        {
          label: 'Ortala',
          click: () => {
            store.data.settings.displayId = null;
            store.data.settings.position = null;
            position();
            show();
          },
        },
        { type: 'separator' },
        { label: 'Veri klasörünü aç', click: () => void shell.openPath(app.getPath('userData')) },
        { label: 'Çıkış', click: () => app.quit() },
      ]),
    );
    tray.on('click', show);
    globalShortcut.register('CommandOrControl+Shift+I', () =>
      store.data.settings.clickThrough || !win.isVisible() ? show() : win.hide(),
    );
    win.on('move', () => {
      if (resizing) return;
      if (moveTimer) clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        const bounds = win.getBounds();
        if (bounds.x === expectedPosition.x && bounds.y === expectedPosition.y) return;
        store.data.settings.position = { x: bounds.x, y: bounds.y };
        store.data.settings.displayId = screen.getDisplayMatching(bounds).id;
        const area = screen.getDisplayMatching(bounds).workArea;
        if (store.data.settings.snapToEdge && Math.abs(bounds.y - area.y) <= 12) {
          bounds.y = area.y;
          store.data.settings.position.y = area.y;
          expectedPosition = { x: bounds.x, y: bounds.y };
          win.setBounds(bounds);
        }
        store.save();
        emitSettings();
        emitLayout(bounds);
      }, 350);
    });
    screen.on('display-metrics-changed', () => position());
    screen.on('display-added', () => position());
    screen.on('display-removed', () => position());
    let liveSamples = 0;
    telemetry = new Telemetry(store, (sample) => {
      if (!win.isDestroyed()) {
        win.webContents.send('telemetry:snapshot', sample);
        publishTaskbar();
        liveSamples++;
        if (captureLive && liveSamples === 4)
          setTimeout(async () => {
            const directory = path.join(process.cwd(), '.artifacts');
            fs.mkdirSync(directory, { recursive: true });
            fs.writeFileSync(
              path.join(directory, 'live-preview.png'),
              (await win.webContents.capturePage()).toPNG(),
            );
            console.log('Live preview saved locally.');
          }, 300);
      }
    });
    powerMonitor.on('suspend', () => {
      telemetry.stop();
      store.save();
    });
    powerMonitor.on('resume', () => {
      telemetry.resetInterval();
      telemetry.start();
    });
    applySettings();
    if (process.env.ISLAND_DEV_URL && !app.isPackaged)
      await win.loadURL(process.env.ISLAND_DEV_URL);
    else await win.loadFile(path.join(root, 'dist', 'index.html'));
    await createTaskbar();
    win.on('closed', () => app.quit());
    if (smoke) win.showInactive();
    else win.show();
    if (smoke) {
      win.webContents.send('telemetry:snapshot', fixture());
      setTimeout(async () => {
        try {
          const state = await win.webContents.executeJavaScript(
            `({text:document.body.innerText, widgets:document.querySelectorAll('[data-widget-card]').length, hasApi:!!window.island, errors:window.__islandErrors || []})`,
          );
          if (
            !state.hasApi ||
            state.widgets < 3 ||
            state.errors.length ||
            !state.text.includes('Cortexia')
          )
            throw new Error('Renderer smoke assertion failed: ' + JSON.stringify(state));
          const artifact = path.join(process.cwd(), '.artifacts');
          fs.mkdirSync(artifact, { recursive: true });
          fs.writeFileSync(
            path.join(artifact, 'showcase.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          const originalBounds = win.getBounds();
          const energyUi = await win.webContents.executeJavaScript(
            `({first:document.querySelector('[data-widget-card]')?.dataset.widgetCard, cost:document.querySelector('[data-value="hero-cost"]')?.textContent, hourly:document.querySelector('[data-value="hourly-cost"]')?.textContent})`,
          );
          if (
            energyUi.first !== 'energy' ||
            energyUi.cost !== '₺2,86' ||
            energyUi.hourly !== '₺0,42'
          )
            throw new Error(
              'Energy hierarchy / cost presentation failed: ' + JSON.stringify(energyUi),
            );
          await win.webContents.executeJavaScript(
            `window.island.getSettings().then(s=>window.island.saveSettings({...s,tariff:null}))`,
          );
          const unpricedFixture = fixture();
          unpricedFixture.today = emptyDay(localDate(Date.now()));
          win.webContents.send('telemetry:snapshot', unpricedFixture);
          await new Promise((resolve) => setTimeout(resolve, 180));
          fs.writeFileSync(
            path.join(artifact, 'tariff-setup.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="tariff"]').click()`,
          );
          await new Promise((resolve) => setTimeout(resolve, 180));
          const tariffFocus = await win.webContents.executeJavaScript(
            `document.activeElement?.getAttribute('name')`,
          );
          if (tariffFocus !== 'tariffCity') throw new Error('Tariff setup focus failed');
          await win.webContents.executeJavaScript(
            `document.querySelector('select[name="tariffCity"]').value='Ankara';document.querySelector('input[name="tariffDistrict"]').value='Çankaya'`,
          );
          fs.writeFileSync(
            path.join(artifact, 'onboarding.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          if (process.argv.includes('--verify-tariff')) {
            const result = await win.webContents.executeJavaScript(
              `window.island.findTariff({city:'Ankara',district:'Çankaya',subscription:'residential',tier:'low'})`,
            );
            if (
              !(result.quote.price > 0) ||
              result.settings.electricity.source !== 'epdk' ||
              store.data.settings.tariff !== result.quote.price
            )
              throw new Error('Online tariff application failed');
            fs.writeFileSync(
              path.join(artifact, 'tariff-check.json'),
              JSON.stringify(result.quote, null, 2),
            );
          }
          const manualTariffFields = await win.webContents.executeJavaScript(
            `document.querySelectorAll('[name="tariff"],[name="tariffSubscription"],[name="tariffTier"],[name="currency"]').length`,
          );
          if (manualTariffFields) throw new Error('Tariff setup must ask only city and district');
          await win.webContents.executeJavaScript(
            `window.island.getSettings().then(s=>window.island.saveSettings({...s,tariff:3.4}))`,
          );
          await win.webContents.executeJavaScript(
            `document.querySelector('#settings-form').requestSubmit()`,
          );
          await new Promise((resolve) => setTimeout(resolve, 180));
          if (store.data.settings.tariff !== 3.4)
            throw new Error('Tariff setup persistence failed');
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="expand"]').click()`,
          );
          win.webContents.send('telemetry:snapshot', fixture());
          await new Promise((resolve) => setTimeout(resolve, 180));
          const handles = await win.webContents.executeJavaScript(
            `document.querySelectorAll('.resize-handle').length`,
          );
          if (handles !== 4) throw new Error('Resize handles failed');
          await win.webContents.executeJavaScript(`window.island.resize('se','start')`);
          win.setBounds({ ...win.getBounds(), width: 640, height: 580 });
          await new Promise((resolve) => setTimeout(resolve, 180));
          await win.webContents.executeJavaScript(`window.island.resize('se','end')`);
          if (store.data.settings.sizes.expanded?.width !== 640)
            throw new Error(
              'Resize persistence failed: ' +
                JSON.stringify({ bounds: win.getBounds(), sizes: store.data.settings.sizes }),
            );
          store.data.settings.sizes = {};
          store.data.settings.position = null;
          position();
          win.setPosition(originalBounds.x + 20, originalBounds.y + 20);
          await new Promise((resolve) => setTimeout(resolve, 700));
          if (!store.data.settings.position) throw new Error('Position persistence failed');
          for (const display of screen.getAllDisplays()) {
            win.setPosition(display.workArea.x + 40, display.workArea.y + 50);
            await new Promise((resolve) => setTimeout(resolve, 700));
            if (store.data.settings.displayId !== display.id)
              throw new Error('Cross-display persistence failed');
          }
          await win.webContents.executeJavaScript('window.island.center()');
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (store.data.settings.position !== null) throw new Error('Position reset failed');
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="hide"]').click()`,
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (win.isVisible()) throw new Error('Hide failed');
          reveal();
          await win.webContents.executeJavaScript(
            `window.island.getSettings().then(s=>window.island.saveSettings({...s,clickThrough:true,opacity:.5}))`,
          );
          if (!store.data.settings.clickThrough || store.data.settings.opacity !== 0.5)
            throw new Error('Click-through/opacity failed');
          reveal();
          if (store.data.settings.clickThrough) throw new Error('Interaction recovery failed');
          store.data.settings.opacity = 1;
          applySettings();
          emitSettings();
          const pause = () => new Promise((resolve) => setTimeout(resolve, 180));
          if (taskbarWin) {
            const bar = await taskbarWin.webContents.executeJavaScript(
              `({api:!!window.islandTaskbar, metrics:[...document.querySelectorAll('[data-taskbar]')].map(e=>e.dataset.taskbar),errors:window.__islandErrors||[]})`,
            );
            if (!bar.api || bar.metrics.join(',') !== 'cost,energy' || bar.errors.length)
              throw new Error('Taskbar renderer failed: ' + JSON.stringify(bar));
            fs.writeFileSync(
              path.join(artifact, 'taskbar.png'),
              (await taskbarWin.webContents.capturePage()).toPNG(),
            );
            await win.webContents.executeJavaScript(
              `window.island.getSettings().then(s=>window.island.saveSettings({...s,taskbar:{enabled:false,metrics:['power','ping']}}))`,
            );
            await pause();
            if (taskbarWin.isVisible()) throw new Error('Taskbar hide failed');
            const metrics = await taskbarWin.webContents.executeJavaScript(
              `[...document.querySelectorAll('[data-taskbar]')].map(e=>e.dataset.taskbar).join(',')`,
            );
            if (metrics !== 'power,ping') throw new Error('Taskbar metric selection failed');
            await taskbarWin.webContents.executeJavaScript(
              `document.querySelector('button').click()`,
            );
            await pause();
            if (!(await win.webContents.executeJavaScript(`!!document.querySelector('.expanded')`)))
              throw new Error('Taskbar expand failed');
            await win.webContents.executeJavaScript(
              `window.island.getSettings().then(s=>window.island.saveSettings({...s,taskbar:{enabled:true,metrics:['cost','energy']}}))`,
            );
          }
          await win.webContents.executeJavaScript(
            `window.island.getSettings().then(s=>window.island.saveSettings({...s,compactMode:'droplet'}))`,
          );
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="compact"]').click()`,
          );
          await pause();
          if (win.getBounds().width !== 88 || win.getBounds().height !== 84)
            throw new Error('Droplet window size failed');
          fs.writeFileSync(
            path.join(artifact, 'droplet.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          const dropRect = await win.webContents.executeJavaScript(
            `(()=>{const r=document.querySelector('.droplet-control').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+8)};})()`,
          );
          win.webContents.sendInputEvent({
            type: 'mouseDown',
            ...dropRect,
            button: 'left',
            clickCount: 1,
          });
          win.webContents.sendInputEvent({ type: 'mouseMove', x: dropRect.x, y: dropRect.y + 40 });
          await pause();
          const stretch = await win.webContents.executeJavaScript(
            `document.querySelector('.droplet-control').style.transform`,
          );
          if (!stretch.includes('scale')) throw new Error('Droplet elastic stretch failed');
          win.webContents.sendInputEvent({
            type: 'mouseUp',
            x: dropRect.x,
            y: dropRect.y + 40,
            button: 'left',
            clickCount: 1,
          });
          await pause();
          if (!(await win.webContents.executeJavaScript(`!!document.querySelector('.expanded')`)))
            throw new Error('Droplet pull-open failed');
          await win.webContents.executeJavaScript(
            `window.island.getSettings().then(s=>window.island.saveSettings({...s,widgets:['health','insights']}))`,
          );
          win.webContents.send('telemetry:snapshot', fixture());
          await pause();
          const noMeter = await win.webContents.executeJavaScript(
            `document.querySelector('[data-value="health"]').textContent`,
          );
          if (!noMeter.includes('Ölçer bağlı değil'))
            throw new Error('Missing electrical data must not be diagnosed');
          const meterFixture = fixture();
          meterFixture.power = {
            source: 'meter',
            available: true,
            watts: 124.8,
            electrical: {
              voltage: 230.4,
              current: 0.56,
              frequency: 50,
              temperature: 32,
              powerFactor: 0.97,
              errors: ['overvoltage'],
            },
          };
          win.webContents.send('telemetry:snapshot', meterFixture);
          await pause();
          const meterUi = await win.webContents.executeJavaScript(
            `({voltage:document.querySelector('[data-value="voltage"]').textContent,status:document.querySelector('[data-value="health"]').textContent})`,
          );
          if (meterUi.voltage !== '230,4' || !meterUi.status.includes('Yüksek voltaj'))
            throw new Error('Electrical meter presentation failed');
          fs.writeFileSync(
            path.join(artifact, 'electrical-demo.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          await win.webContents.executeJavaScript(
            `window.island.getSettings().then(s=>window.island.saveSettings({...s,compactMode:'metrics',widgets:['energy','power','network']}))`,
          );
          win.webContents.send('telemetry:snapshot', fixture());
          await pause();
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="compact"]').click()`,
          );
          await pause();
          if (win.getBounds().height !== 68) throw new Error('Compact window failed');
          const compactAlignment = await win.webContents.executeJavaScript(
            `(()=>{const island=document.querySelector('.compact').getBoundingClientRect();const stats=[...document.querySelectorAll('.compact-stat')].map(e=>e.getBoundingClientRect());const center=(stats[0].left+stats.at(-1).right)/2;return {error:Math.abs(center-(island.left+island.right)/2),overflow:document.querySelector('.compact-readout').scrollWidth>document.querySelector('.compact-readout').clientWidth};})()`,
          );
          if (compactAlignment.error > 1 || compactAlignment.overflow)
            throw new Error(
              'Compact centering/overflow failed: ' + JSON.stringify(compactAlignment),
            );
          fs.writeFileSync(
            path.join(artifact, 'compact.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="expand"]').click()`,
          );
          await pause();
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="settings"]').click()`,
          );
          await pause();
          const widgetCount = await win.webContents.executeJavaScript(
            `document.querySelectorAll('input[name="widget"]').length`,
          );
          if (widgetCount !== 8) throw new Error('Widget selector failed');
          fs.writeFileSync(
            path.join(artifact, 'settings.png'),
            (await win.webContents.capturePage()).toPNG(),
          );
          await win.webContents.executeJavaScript(
            `document.querySelector('input[name="widget"][value="system"]').click();document.querySelector('select[name="language"]').value='en';document.querySelector('input[name="reducedMotion"]').checked=true;document.querySelector('#settings-form').requestSubmit()`,
          );
          await pause();
          if (
            !store.data.settings.widgets.includes('system') ||
            store.data.settings.language !== 'en' ||
            !store.data.settings.reducedMotion
          )
            throw new Error('Settings persistence failed');
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="expand"]').click()`,
          );
          await pause();
          const cards = await win.webContents.executeJavaScript(
            `document.querySelectorAll('[data-widget-card]').length`,
          );
          if (cards !== 4) throw new Error('Widget addition failed');
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="history"]').click()`,
          );
          await pause();
          const rows = await win.webContents.executeJavaScript(
            `document.querySelectorAll('.history-row').length`,
          );
          if (rows !== 2) throw new Error('Energy history failed');
          const errors = await win.webContents.executeJavaScript(`window.__islandErrors || []`);
          if (errors.length) throw new Error(JSON.stringify(errors));
          if (process.argv.includes('--verify-updates')) {
            if (!app.isPackaged)
              throw new Error('Update feed verification requires a packaged application');
            await autoUpdater.checkForUpdates();
            if (update.phase !== 'current')
              throw new Error('Expected current released version: ' + JSON.stringify(update));
            fs.writeFileSync(
              path.join(artifact, 'update-check.json'),
              JSON.stringify({ version: app.getVersion(), ...update }, null, 2),
            );
          }
          fs.writeFileSync(
            path.join(artifact, 'smoke-result.json'),
            JSON.stringify(
              {
                passed: true,
                version: app.getVersion(),
                displayCount: screen.getAllDisplays().length,
                checks: [
                  'preload',
                  'renderer',
                  'collapse-expand',
                  'widget-catalog',
                  'widget-addition',
                  'settings-persistence',
                  'language',
                  'reduced-motion',
                  'energy-history',
                  'position-persistence',
                  'center',
                  'hide-show',
                  'click-through-recovery',
                  'opacity',
                  'corner-resize-persistence',
                  'cross-display-persistence',
                  'energy-first-hierarchy',
                  'daily-hourly-cost',
                  'compact-centered-metrics',
                  'tariff-setup-focus',
                  'tariff-setup-persistence',
                  'location-only-tariff-setup',
                  'droplet-size-stretch-pull-open',
                  'electrical-missing-data-and-meter-warning',
                  'energy-insights',
                  ...(taskbarWin ? ['taskbar-state-selection-hide-expand'] : []),
                ],
                ...state,
              },
              null,
              2,
            ),
          );
          console.log('SMOKE PASS: preload, views, widgets, settings, language, motion, history');
          app.exit(0);
        } catch (error) {
          console.error(error);
          app.exit(1);
        }
      }, 2200);
    } else telemetry.start();
  }
  app.on('second-instance', (_event, args) => {
    if (args.includes('--quit')) {
      app.quit();
      return;
    }
    if (win) {
      win.show();
      win.focus();
    }
  });
  app
    .whenReady()
    .then(createWindow)
    .catch((error) => {
      console.error(error);
      app.exit(1);
    });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => {
    if (moveTimer) clearTimeout(moveTimer);
    globalShortcut.unregisterAll();
    telemetry?.stop();
    if (store) {
      store.save();
      store.backup();
    }
    tray?.destroy();
    taskbarWin?.destroy();
  });
}
