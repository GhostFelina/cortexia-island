import { contextBridge, ipcRenderer } from 'electron';
import type { IslandAPI, Settings, Snapshot, UpdateStatus, View } from '../shared/types';
const api: IslandAPI = {
  findTariff: (request) => ipcRenderer.invoke('tariff:find', request),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
  getSnapshot: () => ipcRenderer.invoke('telemetry:get'),
  getInfo: () => ipcRenderer.invoke('app:info'),
  getLayout: () => ipcRenderer.invoke('window:layout'),
  onLayout: (callback) => {
    const listener = (_: unknown, layout: { docked: boolean }) => callback(layout);
    ipcRenderer.on('window:layout', listener);
    return () => ipcRenderer.removeListener('window:layout', listener);
  },
  setView: (view: View) => ipcRenderer.invoke('window:view', view),
  hide: () => ipcRenderer.invoke('window:hide'),
  quit: () => ipcRenderer.invoke('app:quit'),
  center: () => ipcRenderer.invoke('window:center'),
  resize: (corner, phase) => ipcRenderer.invoke('window:resize', corner, phase),
  setPointerPassthrough: (ignore: boolean) => ipcRenderer.invoke('window:passthrough', ignore),
  exportBackup: () => ipcRenderer.invoke('data:export'),
  importBackup: () => ipcRenderer.invoke('data:import'),
  exportCsv: () => ipcRenderer.invoke('data:csv'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onSnapshot: (callback: (s: Snapshot) => void) => {
    const listener = (_: unknown, s: Snapshot) => callback(s);
    ipcRenderer.on('telemetry:snapshot', listener);
    return () => ipcRenderer.removeListener('telemetry:snapshot', listener);
  },
  onUpdate: (callback: (s: UpdateStatus) => void) => {
    const listener = (_: unknown, s: UpdateStatus) => callback(s);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  onSettings: (callback: (s: Settings) => void) => {
    const listener = (_: unknown, s: Settings) => callback(s);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
};
contextBridge.exposeInMainWorld('island', api);
