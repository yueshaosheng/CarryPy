import { useCallback, useEffect, useState } from 'react';
import { Message } from '@arco-design/web-react';
import { Apple, Windows, Download, Copy, Refresh, LinkOne } from '@icon-park/react';
import { AppInfo, GuiRelease, ReleaseAsset, ReleaseOS } from '@shared/types';
import { RELEASES_PAGE } from '@shared/bundledRelease';
import { fmtSize } from '@renderer/components/format';
import {
  archLabel,
  detectedOS,
  findAsset,
  fmtReleaseDate,
  formatLabel,
  mainButtonLabel,
  osLabel
} from './releaseModel';

function LinuxIcon({ size = 22 }: { size?: number }): React.ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-2.2 0-3.6 1.7-3.6 4v3.2c0 .8-.3 1.6-.8 2.3-1 1.4-2.1 3.2-2.1 5 0 .6.1 1.2.4 1.7-.3.2-.6.5-.6.9 0 .8 1 1.2 2.2 1.5.7.2 1.4.5 1.9.9.6.4 1.5.7 2.6.7s2-.3 2.6-.7c.5-.4 1.2-.7 1.9-.9 1.2-.3 2.2-.7 2.2-1.5 0-.4-.3-.7-.6-.9.3-.5.4-1.1.4-1.7 0-1.8-1.1-3.6-2.1-5-.5-.7-.8-1.5-.8-2.3V6c0-2.3-1.4-4-3.6-4zm-1.4 4.2c.5 0 .9.5.9 1.1s-.4 1.1-.9 1.1-.9-.5-.9-1.1.4-1.1.9-1.1zm2.8 0c.5 0 .9.5.9 1.1s-.4 1.1-.9 1.1-.9-.5-.9-1.1.4-1.1.9-1.1zm-2.5 2.6h2.2l-1.1 1.4-1.1-1.4z" />
    </svg>
  );
}

const OS_ICON: Record<ReleaseOS, (props: { size?: number }) => React.ReactNode> = {
  mac: Apple,
  win: Windows,
  linux: LinuxIcon
};

interface RowSpec {
  arch: string;
  format?: string;
}
const ROWS: Record<ReleaseOS, RowSpec[]> = {
  mac: [
    { arch: 'arm64', format: 'dmg' },
    { arch: 'x64', format: 'dmg' }
  ],
  win: [
    { arch: 'x64', format: 'exe' },
    { arch: 'arm64', format: 'exe' }
  ],
  linux: [
    { arch: 'x64', format: 'deb' },
    { arch: 'x64', format: 'AppImage' },
    { arch: 'arm64', format: 'deb' }
  ]
};

export default function DownloadPage(): React.ReactNode {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [release, setRelease] = useState<GuiRelease | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const [i, r] = await Promise.all([window.carrypy.getInfo(), window.carrypy.getRelease(force)]);
      setInfo(i);
      setRelease(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const os = detectedOS(info);
  const arch = info?.arch ?? 'x64';
  const preferredFormat = os === 'mac' ? 'dmg' : os === 'win' ? 'exe' : 'deb';
  const mainAsset = os ? findAsset(release, os, arch, preferredFormat) ?? findAsset(release, os, arch) : null;

  const download = (asset: ReleaseAsset): void => {
    void window.carrypy.openExternal(asset.url);
  };

  const copyReleases = async (): Promise<void> => {
    await window.carrypy.copyText(RELEASES_PAGE);
    Message.success('已复制 Releases 链接');
  };

  return (
    <div className="page-scroll" style={{ padding: 0 }}>
      <div className="dl-page">
        <div className="dl-inner">
          <div className="dl-hero">
            <h1 className="dl-title">
              获取<span className="brand-serif">CarryPy</span>
            </h1>
            <p className="dl-sub">跨平台最小化 Python 环境打包工具 · 桌面版</p>
            <div className="dl-meta">
              <span className="dl-version">v{release?.version ?? '…'}</span>
              {release?.published_at && (
                <>
                  <span>·</span>
                  <span>发布于 {fmtReleaseDate(release.published_at)}</span>
                </>
              )}
            </div>
            {mainAsset && os && (
              <>
                <button className="dl-main-btn" onClick={() => download(mainAsset)}>
                  <Download size={18} />
                  {mainButtonLabel(os, mainAsset.arch)}
                </button>
                {mainAsset.size > 0 && (
                  <span className="dl-main-size">{fmtSize(mainAsset.size)} · {mainAsset.name}</span>
                )}
              </>
            )}
          </div>

          <div className="dl-divider">所有下载</div>

          <div className="dl-cards">
            {(['mac', 'win', 'linux'] as ReleaseOS[]).map((cardOS, idx) => {
              const Icon = OS_ICON[cardOS];
              const detected = os === cardOS;
              const rows = ROWS[cardOS]
                .map((spec) => ({ spec, asset: findAsset(release, cardOS, spec.arch, spec.format) }))
                .filter((r, i, arr) => {
                  // 同架构多格式保留；无资产的架构行仅在该平台至少有一个资产时显示占位
                  if (r.asset) return true;
                  const hasAny = release?.assets.some((a) => a.os === cardOS && a.arch === r.spec.arch);
                  return !hasAny && arr.findIndex((x) => x.spec.arch === r.spec.arch) === i;
                });
              return (
                <div
                  key={cardOS}
                  className={`dl-card${detected ? ' detected' : ''}`}
                  style={{ animationDelay: `${idx * 90}ms` }}
                >
                  {detected && <span className="dl-detected-badge">已检测</span>}
                  <div className="dl-card-head">
                    <span className="dl-os-icon"><Icon size={22} /></span>
                    <h3>{osLabel(cardOS)}</h3>
                  </div>
                  {rows.length === 0 && (
                    <div className="dl-row">
                      <div className="dl-row-info">
                        <div className="dl-format">暂无可用安装包</div>
                      </div>
                    </div>
                  )}
                  {rows.map(({ spec, asset }) => (
                    <div className="dl-row" key={`${spec.arch}-${spec.format ?? ''}`}>
                      <div className="dl-row-info">
                        <div className="dl-arch">{archLabel(cardOS, spec.arch)}</div>
                        <div className="dl-format">
                          {asset ? formatLabel(asset) : '未提供'}
                          {asset && asset.size > 0 ? ` · ${fmtSize(asset.size)}` : ''}
                        </div>
                      </div>
                      <button
                        className="dl-row-btn"
                        disabled={!asset}
                        onClick={() => asset && download(asset)}
                      >
                        <Download size={14} />
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="dl-foot">
            <LinkOne size={14} />
            也可从
            <span className="mono">GitHub Releases</span>
            下载历史版本
            <button onClick={() => void window.carrypy.openExternal(RELEASES_PAGE)}>打开 Releases</button>
            <button onClick={() => void copyReleases()}>
              <Copy size={13} />
              复制链接
            </button>
          </div>

          <div className="dl-note">
            {release?.source === 'bundled' && (
              <span className="dl-offline">
                离线数据 · 发布后自动更新
                <button className="dl-row-btn" style={{ padding: '3px 12px', fontSize: 12 }} disabled={loading} onClick={() => void load(true)}>
                  <Refresh size={12} />
                  刷新
                </button>
              </span>
            )}
            <br />
            macOS 首次打开若被 Gatekeeper 拦截：右键 → 打开，或执行
            <span className="mono" style={{ margin: '0 4px' }}>xattr -dr com.apple.quarantine /Applications/CarryPy.app</span>
            <br />
            运行构建需要目标打包机安装 Docker；Windows 另需 Git for Windows (Git Bash)。
          </div>
        </div>
      </div>
    </div>
  );
}