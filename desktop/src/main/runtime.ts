import { app } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

export function applyUserDataOverride(): void {
  const override = process.env.CARRYPY_USER_DATA;
  if (override && !app.isPackaged) {
    app.setPath('userData', override);
  }
}

export function isFrozen(): boolean {
  return app.isPackaged;
}

export function stateDir(): string {
  const d = path.join(app.getPath('userData'), 'state');
  fs.mkdirSync(path.join(d, 'logs'), { recursive: true });
  return d;
}

export function logPath(id: string): string {
  return path.join(stateDir(), 'logs', `${id}.log`);
}

function copyTree(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

/** 权限归一: 打包复制/用户操作可能改权限, 与仓库 0755/0644 不一致会改变
 *  docker COPY 层缓存键, 导致每次首建重编译 Python。 */
function normalizeModes(root: string): void {
  if (process.platform === 'win32') return;
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        fs.chmodSync(p, 0o755);
        walk(p);
      } else if (entry.isFile()) {
        fs.chmodSync(p, entry.name.endsWith('.sh') ? 0o755 : 0o644);
      }
    }
  };
  fs.chmodSync(root, 0o755);
  walk(root);
}

/** 开发态 ROOT: 从 appPath 向上找仓库根 (兼容 electron-vite dev 与直接运行 out/main)。 */
function findDevRoot(): string {
  let dir = app.getAppPath();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'build.sh')) && fs.existsSync(path.join(dir, 'config'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(app.getAppPath(), '..');
}

export function getRoot(): string {
  if (!app.isPackaged) {
    return findDevRoot();
  }
  const root = path.join(app.getPath('userData'), `app-${app.getVersion()}`);
  const marker = path.join(root, '.app_version');
  let current = '';
  try {
    current = fs.readFileSync(marker, 'utf-8').trim();
  } catch {
    current = '';
  }
  if (current !== app.getVersion()) {
    copyTree(path.join(process.resourcesPath, 'project'), root);
    fs.writeFileSync(marker, app.getVersion());
  }
  normalizeModes(root);
  return root;
}

export function defaultDistDir(root: string): string {
  return app.isPackaged ? path.join(os.homedir(), 'CarryPy-dist') : path.join(root, 'dist');
}

export function ensureDistLink(root: string, distDir: string): string {
  const dist = path.resolve(distDir);
  fs.mkdirSync(dist, { recursive: true });
  if (app.isPackaged) {
    const link = path.join(root, 'dist');
    let st: fs.Stats | null = null;
    try {
      st = fs.lstatSync(link);
    } catch {
      st = null;
    }
    if (st?.isSymbolicLink()) {
      if (fs.realpathSync(link) !== fs.realpathSync(dist)) {
        fs.unlinkSync(link);
        fs.symlinkSync(dist, link, process.platform === 'win32' ? 'junction' : 'dir');
      }
    } else if (!st) {
      fs.symlinkSync(dist, link, process.platform === 'win32' ? 'junction' : 'dir');
    } else {
      throw new Error(`ROOT/dist 被普通目录占用: ${link}`);
    }
  }
  return dist;
}