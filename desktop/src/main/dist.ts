import { dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { DistFile } from '@shared/types';
import { DIST_NAME } from '@shared/validation';
import { getDistDir } from './settings';
import { stateDir } from './runtime';

function trashDir(): string {
  const d = path.join(stateDir(), 'trash');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

/** 启动时清空回收站 (撤销窗口仅限当次会话)。 */
export function emptyTrash(): void {
  const d = trashDir();
  for (const name of fs.readdirSync(d)) {
    try {
      fs.unlinkSync(path.join(d, name));
    } catch {
      /* ignore */
    }
  }
}

export function listDist(): DistFile[] {
  const dist = getDistDir();
  const out: DistFile[] = [];
  let names: string[] = [];
  try {
    names = fs.readdirSync(dist);
  } catch {
    return out;
  }
  for (const name of names) {
    if (!DIST_NAME.test(name)) continue;
    const p = path.join(dist, name);
    let st: fs.Stats;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    out.push({
      name,
      size: st.size,
      mtime: st.mtimeMs / 1000,
      kind: name.startsWith('mini_python') ? 'base' : 'addon'
    });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

export function safeDistPath(name: string): string | null {
  if (!DIST_NAME.test(name)) return null;
  const dist = getDistDir();
  const p = fs.realpathSync(path.join(dist, name));
  if (path.dirname(p) !== fs.realpathSync(dist)) return null;
  return p;
}

export async function saveDist(name: string): Promise<{ saved: boolean; path?: string }> {
  const p = safeDistPath(name);
  if (!p || !fs.existsSync(p)) throw new Error('文件不存在或名称非法');
  const result = await dialog.showSaveDialog({ title: '另存为', defaultPath: name });
  if (result.canceled || !result.filePath) return { saved: false };
  fs.copyFileSync(p, result.filePath);
  return { saved: true, path: result.filePath };
}

export function revealDist(name: string): void {
  const p = safeDistPath(name);
  if (p && fs.existsSync(p)) shell.showItemInFolder(p);
}

export function deleteDist(name: string): { deleted: string } {
  const p = safeDistPath(name);
  if (!p || !fs.existsSync(p)) throw new Error('文件不存在或名称非法');
  const trashPath = path.join(trashDir(), name);
  try {
    fs.unlinkSync(trashPath);
  } catch {
    /* no previous trash entry */
  }
  fs.renameSync(p, trashPath);
  return { deleted: name };
}

export function restoreDist(name: string): { restored: string } {
  if (!DIST_NAME.test(name)) throw new Error('文件名非法');
  const trashPath = path.join(trashDir(), name);
  if (!fs.existsSync(trashPath)) throw new Error('回收站中无此文件 (撤销窗口已过期)');
  const target = path.join(getDistDir(), name);
  if (fs.existsSync(target)) throw new Error('产物目录已存在同名文件');
  fs.renameSync(trashPath, target);
  return { restored: name };
}