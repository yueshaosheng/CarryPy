import { AppInfo, GuiRelease, ReleaseAsset, ReleaseOS } from '@shared/types';

export function detectedOS(info: AppInfo | null): ReleaseOS | null {
  if (!info) return null;
  if (info.platform === 'darwin') return 'mac';
  if (info.platform === 'win32') return 'win';
  if (info.platform === 'linux') return 'linux';
  return null;
}

export function findAsset(
  release: GuiRelease | null,
  os: ReleaseOS,
  arch: string,
  format?: string
): ReleaseAsset | null {
  if (!release) return null;
  const pool = release.assets.filter((a) => a.os === os && a.arch === arch);
  if (format) {
    const exact = pool.find((a) => a.format === format);
    if (exact) return exact;
  }
  return pool[0] ?? null;
}

export function osLabel(os: ReleaseOS): string {
  return os === 'mac' ? 'macOS' : os === 'win' ? 'Windows' : 'Linux';
}

export function archLabel(os: ReleaseOS, arch: string): string {
  if (os === 'mac') return arch === 'arm64' ? 'Apple Silicon (arm64)' : 'Intel (x64)';
  return arch;
}

export function formatLabel(asset: ReleaseAsset): string {
  switch (asset.format) {
    case 'dmg':
      return '.dmg';
    case 'exe':
      return '.exe';
    case 'deb':
      return '.deb — Debian / Ubuntu';
    case 'AppImage':
      return '.AppImage — 通用 Linux';
  }
}

export function mainButtonLabel(os: ReleaseOS, arch: string): string {
  const archPart = os === 'mac' ? (arch === 'arm64' ? 'Apple Silicon' : 'Intel') : arch;
  return `下载 ${osLabel(os)} 版 (${archPart})`;
}

export function fmtReleaseDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}