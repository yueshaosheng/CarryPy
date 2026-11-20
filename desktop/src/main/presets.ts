import { GuiPreset, Presets } from '@shared/types';

const APT_PYQT6 =
  'libglib2.0-0 libgl1 libegl1 libfontconfig1 libfreetype6 libxkbcommon0 ' +
  'libxkbcommon-x11-0 libdbus-1-3 libx11-6 libx11-xcb1 libxcb1 libxext6 ' +
  'libxrender1 libxi6 libsm6 libice6 libxcb-icccm4 libxcb-image0 ' +
  'libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 libxcb-render0 ' +
  'libxcb-shape0 libxcb-shm0 libxcb-sync1 libxcb-xfixes0 libxcb-xinerama0 ' +
  'libxcb-xkb1 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxtst6 ' +
  'libxcursor1 libasound2 libnss3 libgssapi-krb5-2 ' +
  'libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 libopengl0 libxcb-cursor0';

const DNF_PYQT6 =
  'glib2 mesa-libGL mesa-libEGL fontconfig freetype libxkbcommon ' +
  'libxkbcommon-x11 dbus-libs libX11 libXext libXrender libXi libSM libICE ' +
  'xcb-util xcb-util-image xcb-util-keysyms xcb-util-renderutil xcb-util-wm ' +
  'libXcomposite libXdamage libXfixes libXrandr libXtst libXcursor alsa-lib ' +
  'nss gstreamer1 gstreamer1-plugins-base';

const YUM_PYQT5 =
  'glib2 mesa-libGL mesa-libEGL fontconfig freetype libxkbcommon libxkbcommon-x11 ' +
  'dbus-libs libX11 libXext libXrender libXi libSM libICE xcb-util xcb-util-image ' +
  'xcb-util-keysyms xcb-util-renderutil xcb-util-wm libXcomposite libXdamage ' +
  'libXfixes libXrandr libXtst alsa-lib nss gstreamer1 gstreamer1-plugins-base';

function t64(aptList: string): string {
  return aptList
    .replace('libglib2.0-0', 'libglib2.0-0t64')
    .replace('libasound2', 'libasound2t64');
}

export function guiPreset(platform: string): GuiPreset {
  switch (platform) {
    case 'ubuntu20_amd64':
    case 'ubuntu22_amd64':
    case 'debian11_amd64':
    case 'debian12_amd64':
      return { available: true, packages: ['pyqt6'], system_pkgs: APT_PYQT6 };
    case 'ubuntu24_amd64':
      return { available: true, packages: ['pyqt6'], system_pkgs: t64(APT_PYQT6) };
    case 'rocky8_amd64':
      return { available: true, packages: ['pyqt6'], system_pkgs: DNF_PYQT6 };
    case 'rocky9_amd64':
      return { available: true, packages: ['pyqt6'], system_pkgs: DNF_PYQT6 + ' xcb-util-cursor' };
    case 'centos7_amd64':
      return { available: true, packages: ['pyqt5'], system_pkgs: YUM_PYQT5 };
    case 'ubuntu18_amd64':
      return {
        available: false,
        reason: '需自编 Qt 6.2 运行时 (u18_qt6_stage 特殊流程, 见 ADVANCED 文档)',
        packages: [],
        system_pkgs: ''
      };
    case 'centos6_amd64':
      return { available: false, reason: 'glibc 2.12 无可行 GUI 包', packages: [], system_pkgs: '' };
    default:
      return { available: false, reason: '未知平台', packages: [], system_pkgs: '' };
  }
}

export function presetsFor(platform: string, defaultPackages: string[]): Presets {
  return { science: { packages: [...defaultPackages] }, gui: guiPreset(platform) };
}