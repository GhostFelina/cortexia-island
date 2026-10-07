import { contextBridge, ipcRenderer } from 'electron';
import type { TaskbarAPI } from '../shared/types';
const api: TaskbarAPI = {
  getState: () => ipcRenderer.invoke('taskbar:state'),
  showIsland: () => ipcRenderer.invoke('taskbar:show'),
  onState: (callback) => {
    const listener = (_: unknown, state: Parameters<typeof callback>[0]) => callback(state);
    ipcRenderer.on('taskbar:state', listener);
    return () => ipcRenderer.removeListener('taskbar:state', listener);
  },
};
contextBridge.exposeInMainWorld('islandTaskbar', api);
