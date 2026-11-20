import fs from 'fs';
import path from 'path';
import { PlatformInfo } from '@shared/types';
import { validPlatformName } from '@shared/validation';

const CONF_LINE = /^([A-Z_]+)="([^"]*)"/;

export function parseConf(file: string): Record<string, string> {
  const conf: Record<string, string> = {};
  const text = fs.readFileSync(file, 'utf-8');
  for (const line of text.split('\n')) {
    const m = CONF_LINE.exec(line);
    if (m) conf[m[1]] = m[2];
  }
  return conf;
}

export function listPlatforms(root: string): PlatformInfo[] {
  const confDir = path.join(root, 'config');
  const out: PlatformInfo[] = [];
  for (const fn of fs.readdirSync(confDir).sort()) {
    if (!fn.endsWith('.conf') || fn === 'example.conf') continue;
    const name = fn.slice(0, -5);
    if (!validPlatformName(name)) continue;
    const conf = parseConf(path.join(confDir, fn));
    out.push({
      name,
      base_image: conf.BASE_IMAGE ?? '',
      docker_platform: conf.DOCKER_PLATFORM ?? '',
      python_version: conf.PYTHON_VERSION ?? '',
      default_packages: (conf.DEFAULT_PACKAGES ?? '').split(/\s+/).filter(Boolean)
    });
  }
  return out;
}

export function platformExists(root: string, name: string): boolean {
  return validPlatformName(name) && fs.existsSync(path.join(root, 'config', `${name}.conf`));
}

export function imageTag(platform: string, pythonVersion: string): string {
  const short = pythonVersion.split('.').slice(0, 2).join('.');
  return `mini-py-pack/${platform}:py${short}`;
}