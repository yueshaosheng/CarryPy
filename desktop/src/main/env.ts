import fs from 'fs';
import os from 'os';
import path from 'path';

/** macOS/Linux GUI 启动 (Finder/Dock/桌面快捷方式) 不继承终端 PATH,
 *  docker/homebrew 等命令会 ENOENT。启动时把常见安装位置补进 process.env.PATH,
 *  使 docker 查询与构建脚本子进程都能找到它们。 */
const EXTRA_DIRS =
  process.platform === 'win32'
    ? []
    : [
        '/usr/local/bin',
        '/opt/homebrew/bin',
        path.join(os.homedir(), '.docker', 'bin'),
        '/Applications/Docker.app/Contents/Resources/bin',
        '/snap/bin'
      ];

export function augmentPath(): void {
  const parts = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of EXTRA_DIRS) {
    if (!parts.includes(dir) && fs.existsSync(dir)) parts.unshift(dir);
  }
  process.env.PATH = parts.join(path.delimiter);
}

let cached: string | null | undefined;

/** 在 PATH 与常见安装位置中解析 docker 可执行文件。 */
export function findDocker(): string | null {
  if (cached !== undefined) return cached;
  const exe = process.platform === 'win32' ? 'docker.exe' : 'docker';
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const dir of [...EXTRA_DIRS, ...dirs]) {
    const p = path.join(dir, exe);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      cached = p;
      return p;
    } catch {
      /* keep looking */
    }
  }
  cached = null;
  return null;
}