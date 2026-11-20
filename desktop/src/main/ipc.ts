import { app, clipboard, dialog, ipcMain, shell } from 'electron';
import { execFile } from 'child_process';
import fs from 'fs';
import { CH } from '@shared/channels';
import { AppInfo, BatchRequest, BuildParams, Settings, ThemeMode } from '@shared/types';
import { normalizeParams, validateBuildParams } from '@shared/validation';
import * as dist from './dist';
import * as dockerUtil from './dockerUtil';
import { getSettings, chooseDistDir, setTheme, getRootDir } from './settings';
import { listPlatforms, parseConf, platformExists } from './platformConf';
import { presetsFor } from './presets';
import { getRanking } from './pypiStats';
import { TaskManager, findBash } from './taskManager';
import path from 'path';

let manager: TaskManager;

function senderOk(event: Electron.IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) return url.startsWith(devUrl) || url.startsWith('http://localhost:');
  return url.startsWith('file://') && url.includes('renderer');
}

function rosetta(): Promise<boolean> {
  if (process.platform !== 'darwin') return Promise.resolve(false);
  return new Promise((resolve) => {
    execFile('sysctl', ['-n', 'sysctl.proc_translated'], (err, stdout) => {
      resolve(!err && stdout.trim() === '1');
    });
  });
}

async function appInfo(): Promise<AppInfo> {
  const translated = await rosetta();
  let arch = process.arch;
  if (translated && arch === 'x64') arch = 'arm64';
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch,
    isPackaged: app.isPackaged,
    rosetta: translated,
    bashAvailable: process.platform !== 'win32' || findBash() !== null
  };
}

export function registerIpc(tm: TaskManager): void {
  manager = tm;

  const handle = <T>(channel: string, fn: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => T | Promise<T>): void => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!senderOk(event)) throw new Error('forbidden');
      return fn(event, ...args);
    });
  };

  handle(CH.appGetInfo, () => appInfo());
  handle(CH.appCopyText, (_e, text) => {
    if (typeof text === 'string') clipboard.writeText(text);
  });
  handle(CH.appOpenExternal, (_e, url) => {
    if (
      typeof url === 'string' &&
      (url.startsWith('https://github.com/') ||
        url.startsWith('https://objects.githubusercontent.com/'))
    ) {
      return shell.openExternal(url);
    }
    throw new Error('仅允许打开 GitHub 链接');
  });

  handle(CH.platformsList, () => listPlatforms(getRootDir()));
  handle(CH.presetsGet, (_e, platform) => {
    if (typeof platform !== 'string' || !platformExists(getRootDir(), platform))
      throw new Error('未知平台');
    const conf = parseConf(path.join(getRootDir(), 'config', `${platform}.conf`));
    return presetsFor(platform, (conf.DEFAULT_PACKAGES ?? '').split(/\s+/).filter(Boolean));
  });

  handle(CH.dockerStatus, () => dockerUtil.dockerStatus());
  handle(CH.dockerImages, () => dockerUtil.dockerImages());

  handle(CH.tasksList, (_e, limit) =>
    manager.list(typeof limit === 'number' ? limit : 50)
  );
  handle(CH.tasksGet, (_e, id) => {
    if (typeof id !== 'string') return null;
    const t = manager.get(id);
    if (!t) return null;
    let logSize = 0;
    try {
      logSize = fs.statSync(path.join(getSettings().state_dir, 'logs', `${id}.log`)).size;
    } catch {
      logSize = 0;
    }
    return { ...t, log_size: logSize };
  });
  handle(CH.tasksCreate, (_e, params) => {
    const err = validateBuildParams(params);
    if (err) return { ok: false, error: err };
    const p = params as BuildParams;
    if (!platformExists(getRootDir(), p.platform))
      return { ok: false, error: `未知平台: ${p.platform}` };
    if (process.platform === 'win32' && !findBash())
      return { ok: false, error: '未检测到 Git Bash, 无法执行构建脚本 (请安装 Git for Windows)' };
    return manager.create(normalizeParams(p));
  });
  handle(CH.tasksCreateBatch, (_e, req) => {
    const r = req as BatchRequest;
    if (!r || !['base', 'science', 'current'].includes(r.mode))
      return { ok: false, error: 'mode 必须是 base/science/current' };
    if (!Array.isArray(r.platforms) || r.platforms.length === 0)
      return { ok: false, error: '至少选择一个平台' };
    for (const pf of r.platforms) {
      if (typeof pf !== 'string' || !platformExists(getRootDir(), pf))
        return { ok: false, error: `未知平台: ${String(pf)}` };
    }
    if (r.mode === 'current') {
      const err = validateBuildParams(r.current);
      if (err) return { ok: false, error: err };
    }
    if (process.platform === 'win32' && !findBash())
      return { ok: false, error: '未检测到 Git Bash, 无法执行构建脚本 (请安装 Git for Windows)' };
    return manager.createBatch(r);
  });
  handle(CH.tasksCancelBatch, (_e, batchId) => {
    if (typeof batchId !== 'string') return { cancelled: 0 };
    return manager.cancelBatch(batchId);
  });
  handle(CH.tasksCancel, (_e, id) => {
    if (typeof id !== 'string') return { result: 'not_found' };
    return manager.cancel(id);
  });
  handle(CH.tasksReadLog, (_e, id, offset) => {
    if (typeof id !== 'string') return null;
    const off = typeof offset === 'number' && Number.isFinite(offset) ? offset : 0;
    return manager.readLog(id, off);
  });
  handle(CH.tasksExportLog, async (_e, id) => {
    if (typeof id !== 'string') return { saved: false };
    const chunk = manager.readLog(id, 0);
    if (!chunk) return { saved: false };
    const result = await dialog.showSaveDialog({
      title: '导出日志',
      defaultPath: `carrypy-${id}.log`
    });
    if (result.canceled || !result.filePath) return { saved: false };
    fs.writeFileSync(result.filePath, chunk.text);
    return { saved: true, path: result.filePath };
  });

  handle(CH.distList, () => dist.listDist());
  handle(CH.distSaveAs, (_e, name) => {
    if (typeof name !== 'string') throw new Error('文件名非法');
    return dist.saveDist(name);
  });
  handle(CH.distReveal, (_e, name) => {
    if (typeof name !== 'string') throw new Error('文件名非法');
    dist.revealDist(name);
  });
  handle(CH.distDelete, (_e, name) => {
    if (typeof name !== 'string') throw new Error('文件名非法');
    return dist.deleteDist(name);
  });
  handle(CH.distRestore, (_e, name) => {
    if (typeof name !== 'string') throw new Error('文件名非法');
    return dist.restoreDist(name);
  });

  handle(CH.pypiRanking, (_e, force) => getRanking(force === true));

  handle(CH.settingsGet, (): Settings => getSettings());
  handle(CH.settingsChooseDistDir, () => chooseDistDir());
  handle(CH.settingsSetTheme, (_e, theme) => {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system')
      throw new Error('主题非法');
    return setTheme(theme as ThemeMode);
  });
}