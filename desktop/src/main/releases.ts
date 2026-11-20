import { GuiRelease, ReleaseArch, ReleaseAsset, ReleaseFormat, ReleaseOS } from '@shared/types';
import { BUNDLED_RELEASE } from '@shared/bundledRelease';

const ASSET_RE = /^CarryPy-([\d.]+)-(mac|win|linux)-(arm64|x64)\.(dmg|exe|deb|AppImage)$/;
const API = 'https://api.github.com/repos/yueshaosheng/CarryPy/releases?per_page=30';
const CACHE_MS = 10 * 60 * 1000;

let cache: { ts: number; release: GuiRelease } | null = null;

interface GhAsset {
  name: string;
  browser_download_url: string;
  size: number;
}
interface GhRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  assets: GhAsset[];
}

function parseAsset(a: GhAsset): ReleaseAsset | null {
  const m = ASSET_RE.exec(a.name);
  if (!m) return null;
  return {
    name: a.name,
    url: a.browser_download_url,
    size: a.size,
    os: m[2] as ReleaseOS,
    arch: m[3] as ReleaseArch,
    format: m[4] as ReleaseFormat
  };
}

function mergeBundled(assets: ReleaseAsset[], base: GuiRelease): ReleaseAsset[] {
  const out = [...assets];
  for (const b of base.assets) {
    if (!out.some((a) => a.os === b.os && a.arch === b.arch && a.format === b.format)) {
      out.push(b);
    }
  }
  return out;
}

export async function getRelease(force = false): Promise<GuiRelease> {
  if (!force && cache && Date.now() - cache.ts < CACHE_MS) return cache.release;
  if (process.env.CARRYPY_OFFLINE === '1') return { ...BUNDLED_RELEASE };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(API, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'CarryPy-Desktop', Accept: 'application/vnd.github+json' }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const releases = (await res.json()) as GhRelease[];
    const candidates = releases.filter((r) => r.tag_name.startsWith('gui-v') && !r.draft);
    const stable = candidates.filter((r) => !r.prerelease);
    const picked = (stable.length > 0 ? stable : candidates)[0];
    if (!picked) throw new Error('no gui release');
    const assets = picked.assets.map(parseAsset).filter((a): a is ReleaseAsset => a !== null);
    const release: GuiRelease = {
      tag: picked.tag_name,
      version: picked.tag_name.replace(/^gui-v/, ''),
      published_at: picked.published_at,
      html_url: picked.html_url,
      assets: mergeBundled(assets, BUNDLED_RELEASE),
      source: 'github'
    };
    cache = { ts: Date.now(), release };
    return release;
  } catch {
    return { ...BUNDLED_RELEASE };
  }
}