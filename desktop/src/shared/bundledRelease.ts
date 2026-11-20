import { GuiRelease } from './types';

/** 离线兜底 manifest：发布 gui-v* release 后回填资产清单。
 *  url 为 release 资产的标准下载路径，发布后即生效。 */
export const BUNDLED_RELEASE: GuiRelease = {
  tag: 'gui-v1.0.0',
  version: '1.0.0',
  published_at: '',
  html_url: 'https://github.com/yueshaosheng/CarryPy/releases/tag/gui-v1.0.0',
  source: 'bundled',
  assets: [
    {
      name: 'CarryPy-1.0.0-mac-arm64.dmg',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-mac-arm64.dmg',
      size: 0,
      os: 'mac',
      arch: 'arm64',
      format: 'dmg'
    },
    {
      name: 'CarryPy-1.0.0-mac-x64.dmg',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-mac-x64.dmg',
      size: 0,
      os: 'mac',
      arch: 'x64',
      format: 'dmg'
    },
    {
      name: 'CarryPy-1.0.0-win-x64.exe',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-win-x64.exe',
      size: 0,
      os: 'win',
      arch: 'x64',
      format: 'exe'
    },
    {
      name: 'CarryPy-1.0.0-linux-x64.deb',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-linux-x64.deb',
      size: 0,
      os: 'linux',
      arch: 'x64',
      format: 'deb'
    },
    {
      name: 'CarryPy-1.0.0-linux-x64.AppImage',
      url: 'https://github.com/yueshaosheng/CarryPy/releases/download/gui-v1.0.0/CarryPy-1.0.0-linux-x64.AppImage',
      size: 0,
      os: 'linux',
      arch: 'x64',
      format: 'AppImage'
    }
  ]
};

export const RELEASES_PAGE = 'https://github.com/yueshaosheng/CarryPy/releases';