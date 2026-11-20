import { BuildParams, ENV_KEYS, EnvKey } from './types';

const PLATFORM_NAME = /^[a-z0-9_]+$/;
const PACKAGE =
  /^[A-Za-z0-9][A-Za-z0-9._-]*(\[[A-Za-z0-9,]+\])?((==|>=|<=|~=|!=|>|<)[A-Za-z0-9.*+_!-]+)?$/;
const SYSTEM_PKG = /^[A-Za-z0-9][A-Za-z0-9.+:_-]*$/;
const PYTHON_VER = /^\d+\.\d+(\.\d+)?$/;
export const DIST_NAME = /^(mini_python|addon)-[A-Za-z0-9._+-]+\.tar\.gz$/;

export function validPlatformName(name: unknown): name is string {
  return typeof name === 'string' && PLATFORM_NAME.test(name) && name !== 'example';
}

export function validPackage(p: unknown): p is string {
  return typeof p === 'string' && PACKAGE.test(p);
}

export function validSystemPkg(p: unknown): p is string {
  return typeof p === 'string' && SYSTEM_PKG.test(p);
}

export function validPython(v: unknown): v is string {
  return typeof v === 'string' && PYTHON_VER.test(v);
}

export function validEnvValue(v: unknown): v is string {
  return typeof v === 'string' && ![...v].some((c) => c.charCodeAt(0) < 32);
}

export function splitPackages(text: string): string[] {
  return text.split(/[\s,]+/).filter(Boolean);
}

/** 与 Python 版 server.py _validate_task_params 逐条对齐；平台存在性由主进程补查。 */
export function validateBuildParams(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return '请求体必须是对象';
  const b = body as Partial<BuildParams>;
  if (b.type !== 'base' && b.type !== 'full' && b.type !== 'addon')
    return 'type 必须是 base/full/addon';
  if (!validPlatformName(b.platform)) return `未知平台: ${String(b.platform)}`;
  const packages = b.packages ?? [];
  if (!Array.isArray(packages) || !packages.every(validPackage))
    return '包名非法 (允许字母数字._- 与版本约束)';
  if (b.type === 'addon' && packages.length === 0) return '增量包至少指定一个包';
  if (b.type === 'full' && packages.length === 0) return '全量包至少指定一个包 (空包请用 base)';
  const systemPkgs = b.system_pkgs ?? [];
  if (!Array.isArray(systemPkgs) || !systemPkgs.every(validSystemPkg))
    return 'system_pkgs 包名非法';
  if (systemPkgs.length > 0 && b.type !== 'addon') return 'system_pkgs 仅增量包可用';
  if (b.python && !validPython(b.python)) return 'python 版本格式应为 3.11 或 3.11.16';
  const env = b.env ?? {};
  if (typeof env !== 'object' || env === null) return 'env 必须是对象';
  for (const [k, v] of Object.entries(env)) {
    if (!(ENV_KEYS as readonly string[]).includes(k)) return `不支持的环境变量: ${k}`;
    if (!validEnvValue(v)) return `环境变量值含非法字符: ${k}`;
  }
  if (b.type === 'addon' && (b.optimize || b.no_cache))
    return 'optimize/no_cache 仅基础包/全量包可用';
  return null;
}

export function normalizeParams(body: BuildParams): BuildParams {
  const env: Partial<Record<EnvKey, string>> = {};
  for (const k of ENV_KEYS) {
    const v = body.env?.[k];
    if (v) env[k] = v;
  }
  return {
    type: body.type,
    platform: body.platform,
    packages: body.type === 'base' ? [] : (body.packages ?? []),
    python: body.python ?? '',
    optimize: body.type !== 'addon' && !!body.optimize,
    no_cache: body.type !== 'addon' && !!body.no_cache,
    system_pkgs: body.type === 'addon' ? (body.system_pkgs ?? []) : [],
    env
  };
}