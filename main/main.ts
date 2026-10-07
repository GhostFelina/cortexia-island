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
import { DataStore } from './store';
import { Telemetry } from './telemetry';
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
  let tray: Tray;
  let store: DataStore;
  let telemetry: Telemetry;
  let view: View = smoke ? 'expanded' : 'compact';
  let update: UpdateStatus = { phase: 'idle' };
  let expectedPosition = { x: 0, y: 0 };
  let moveTimer: NodeJS.Timeout | undefined;
  let resizing: { corner: string; bounds: Electron.Rectangle; cursor: Electron.Point } | undefined;
  const root = path.join(__dirname, '..', '..');
  const heights: Record<View, number> = { compact: 68, expanded: 520, settings: 760 };
  let layout = { docked: true };
  function emitLayout(bounds = win.getBounds()) {
    const area = screen.getDisplayMatching(bounds).workArea;
    layout = { docked: Math.abs(bounds.y - area.y) <= 1 };
    win.webContents.send('window:layout', layout);
  }
  function position() {
    const displays = screen.getAllDisplays();
    const saved = store.data.settings.position;
    const size = store.data.settings.sizes[view];
    const display = locateDisplay(
      displays,
      saved
        ? {
            ...saved,
            width: size?.width ?? (view === 'compact' ? 400 : 560),
            height: size?.height ?? heights[view],
          }
        : null,
      store.data.settings.displayId ?? screen.getPrimaryDisplay().id,
    );
    const area = display.workArea;
    const width = Math.min(size?.width ?? (view === 'compact' ? 400 : 560), area.width);
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
  }
  function applySettings() {
    win.setAlwaysOnTop(store.data.settings.alwaysOnTop, 'floating');
    win.setOpacity(store.data.settings.opacity);
    win.setIgnoreMouseEvents(store.data.settings.clickThrough, { forward: true });
    if (app.isPackaged && !smoke)
      app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtLogin });
    position();
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
    if (process.argv.includes('--dock')) {
      store.data.settings.position = null;
      store.data.settings.topOffset = 0;
    }
    if (smoke)
      store.data = {
        schemaVersion: 1,
        settings: { ...structuredClone(DEFAULT_SETTINGS), tariff: 3.4 },
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
    register('settings:save', (input: unknown) => {
      const settings = validateSettings(input);
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
        const n = sample.network;
        tray.setToolTip(
          `Cortexia Island · ↓ ${(((n.downBps ?? 0) * 8) / 1e6).toFixed(1)} Mbps · ${sample.power.watts?.toFixed(0) ?? '—'} W`,
        );
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
          await win.webContents.executeJavaScript(
            `document.querySelector('[data-action="compact"]').click()`,
          );
          await pause();
          if (win.getBounds().height !== 68) throw new Error('Compact window failed');
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
          if (widgetCount !== 6) throw new Error('Widget selector failed');
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
  });
}
