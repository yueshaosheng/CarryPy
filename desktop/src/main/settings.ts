import { dialog, nativeTheme } from 'electron';
import fs from 'fs';
import path from 'path';
import { Settings, ThemeMode } from '@shared/types';
import { APP_VERSION } from '@shared/version';
import { defaultDistDir, ensureDistLink, getRoot, isFrozen, stateDir } from './runtime';

interface StoredSettings {
  dist_dir?: string;
  theme?: ThemeMode;
}

let root = '';
let distDir = '';

function settingsPath(): string {
  return path.join(stateDir(), 'settings.json');
}

function loadStored(): StoredSettings {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf-8')) as StoredSettings;
  } catch {
    return {};
  }
}

function saveStored(s: StoredSettings): void {
  const tmp = settingsPath() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2));
  fs.renameSync(tmp, settingsPath());
}

export function initSettings(): void {
  root = getRoot();
  const stored = loadStored();
  const target = isFrozen() ? stored.dist_dir || defaultDistDir(root) : defaultDistDir(root);
  distDir = ensureDistLink(root, target);
  applyTheme(stored.theme ?? 'light');
}

export function getRootDir(): string {
  return root;
}

export function getDistDir(): string {
  return distDir;
}

export function getSettings(): Settings {
  const stored = loadStored();
  return {
    dist_dir: distDir,
    theme: stored.theme ?? 'light',
    editable: isFrozen(),
    frozen: isFrozen(),
    version: APP_VERSION,
    root,
    state_dir: stateDir()
  };
}

export async function chooseDistDir(): Promise<Settings | null> {
  if (!isFrozen()) return null;
  const result = await dialog.showOpenDialog({
    title: '选择产物输出目录',
    defaultPath: distDir,
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const chosen = result.filePaths[0];
  distDir = ensureDistLink(root, chosen);
  const stored = loadStored();
  stored.dist_dir = distDir;
  saveStored(stored);
  return getSettings();
}

export function applyTheme(theme: ThemeMode): void {
  nativeTheme.themeSource = theme;
}

export function setTheme(theme: ThemeMode): Settings {
  const stored = loadStored();
  stored.theme = theme;
  saveStored(stored);
  applyTheme(theme);
  return getSettings();
}