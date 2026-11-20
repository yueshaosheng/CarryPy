import { GuiRelease } from './types';

/** 离线兜底 manifest：与 gui-v1.0.0 release 资产同步 (2026-11-20 CI 实测)。
 *  在线拉取失败时首屏仍有完整数据；发布新版本后回填此清单。 */
export const BUNDLED_RELEASE: GuiRelease = {
  tag: 'gui-v1.0.0',
  version: '1.0.0',
  published_at: '2026-11-20T04:43:26Z',
  html_url: 'https://github.com/yueshaosheng/CarryPy/releases/tag/gui-v1.0.0',
  source: 'bundled',
  assets: [
    {
      name: 'CarryPy-1.0.0-mac-arm64.dmg',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-mac-arm64.dmg',
      size: 117982161,
      os: 'mac',
      arch: 'arm64',
      format: 'dmg'
    },
    {
      name: 'CarryPy-1.0.0-mac-x64.dmg',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-mac-x64.dmg',
      size: 122748219,
      os: 'mac',
      arch: 'x64',
      format: 'dmg'
    },
    {
      name: 'CarryPy-1.0.0-win-x64.exe',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-win-x64.exe',
      size: 105017061,
      os: 'win',
      arch: 'x64',
      format: 'exe'
    },
    {
      name: 'CarryPy-1.0.0-linux-x64.deb',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-linux-x64.deb',
      size: 95997024,
      os: 'linux',
      arch: 'x64',
      format: 'deb'
    },
    {
      name: 'CarryPy-1.0.0-linux-x64.AppImage',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-linux-x64.AppImage',
      size: 123522700,
      os: 'linux',
      arch: 'x64',
      format: 'AppImage'
    }
  ]
};

export const RELEASES_PAGE = 'https://github.com/yueshaosheng/CarryPy/releases';