import { GuiRelease } from './types';

/** 离线兜底 manifest：gui-v1.0.1 发布后回填资产清单。
 *  在线拉取失败时首屏仍有完整数据；发布新版本后回填此清单。 */
export const BUNDLED_RELEASE: GuiRelease = {
  tag: 'gui-v1.0.1',
  version: '1.0.1',
  published_at: '',
  html_url: 'https://github.com/yueshaosheng/CarryPy/releases/tag/gui-v1.0.1',
  source: 'bundled',
  assets: [
    {
      name: 'CarryPy-1.0.1-mac-arm64.dmg',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.1/CarryPy-1.0.1-mac-arm64.dmg',
      size: 0,
      os: 'mac',
      arch: 'arm64',
      format: 'dmg'
    },
    {
      name: 'CarryPy-1.0.1-mac-x64.dmg',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.1/CarryPy-1.0.1-mac-x64.dmg',
      size: 0,
      os: 'mac',
      arch: 'x64',
      format: 'dmg'
    },
    {
      name: 'CarryPy-1.0.1-win-x64.exe',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.1/CarryPy-1.0.1-win-x64.exe',
      size: 0,
      os: 'win',
      arch: 'x64',
      format: 'exe'
    },
    {
      name: 'CarryPy-1.0.1-linux-x64.deb',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.1/CarryPy-1.0.1-linux-x64.deb',
      size: 0,
      os: 'linux',
      arch: 'x64',
      format: 'deb'
    },
    {
      name: 'CarryPy-1.0.1-linux-x64.AppImage',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.1/CarryPy-1.0.1-linux-x64.AppImage',
      size: 0,
      os: 'linux',
      arch: 'x64',
      format: 'AppImage'
    }
  ]
};

export const RELEASES_PAGE = 'https://github.com/yueshaosheng/CarryPy/releases';