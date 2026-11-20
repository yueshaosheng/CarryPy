import { contextBridge, ipcRenderer } from 'electron';
import { CH } from '@shared/channels';
import { CarryPyApi } from '@shared/api';
import { Task, TaskLogEvent } from '@shared/types';

const api: CarryPyApi = {
  getInfo: () => ipcRenderer.invoke(CH.appGetInfo),
  copyText: (text) => ipcRenderer.invoke(CH.appCopyText, text),
  openExternal: (url) => ipcRenderer.invoke(CH.appOpenExternal, url),
  listPlatforms: () => ipcRenderer.invoke(CH.platformsList),
  getPresets: (platform) => ipcRenderer.invoke(CH.presetsGet, platform),
  dockerStatus: () => ipcRenderer.invoke(CH.dockerStatus),
  dockerImages: () => ipcRenderer.invoke(CH.dockerImages),
  listTasks: (limit) => ipcRenderer.invoke(CH.tasksList, limit),
  getTask: (id) => ipcRenderer.invoke(CH.tasksGet, id),
  createTask: (params) => ipcRenderer.invoke(CH.tasksCreate, params),
  cancelTask: (id) => ipcRenderer.invoke(CH.tasksCancel, id),
  readLog: (id, offset) => ipcRenderer.invoke(CH.tasksReadLog, id, offset),
  exportLog: (id) => ipcRenderer.invoke(CH.tasksExportLog, id),
  listDist: () => ipcRenderer.invoke(CH.distList),
  saveDist: (name) => ipcRenderer.invoke(CH.distSaveAs, name),
  revealDist: (name) => ipcRenderer.invoke(CH.distReveal, name),
  deleteDist: (name) => ipcRenderer.invoke(CH.distDelete, name),
  restoreDist: (name) => ipcRenderer.invoke(CH.distRestore, name),
  getSettings: () => ipcRenderer.invoke(CH.settingsGet),
  chooseDistDir: () => ipcRenderer.invoke(CH.settingsChooseDistDir),
  setTheme: (theme) => ipcRenderer.invoke(CH.settingsSetTheme, theme),
  getRelease: (force) => ipcRenderer.invoke(CH.releasesGet, force),
  onTaskUpdated: (cb) => {
    const listener = (_e: unknown, task: Task): void => cb(task);
    ipcRenderer.on(CH.evTaskUpdated, listener);
    return () => ipcRenderer.removeListener(CH.evTaskUpdated, listener);
  },
  onTaskLog: (cb) => {
    const listener = (_e: unknown, event: TaskLogEvent): void => cb(event);
    ipcRenderer.on(CH.evTaskLog, listener);
    return () => ipcRenderer.removeListener(CH.evTaskLog, listener);
  },
  onThemeChanged: (cb) => {
    const listener = (_e: unknown, dark: boolean): void => cb(dark);
    ipcRenderer.on(CH.evThemeChanged, listener);
    return () => ipcRenderer.removeListener(CH.evThemeChanged, listener);
  }
};

contextBridge.exposeInMainWorld('carrypy', api);