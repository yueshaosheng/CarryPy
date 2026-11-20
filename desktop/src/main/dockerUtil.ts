import { DockerImage, DockerStatus } from '@shared/types';
import { findDocker } from './env';
import { runCapture } from './proc';

let cache: { ts: number; status: DockerStatus } | null = null;

export async function dockerStatus(): Promise<DockerStatus> {
  const now = Date.now();
  if (cache && now - cache.ts < 5000) return cache.status;
  const docker = findDocker();
  let status: DockerStatus;
  if (!docker) {
    status = {
      ok: false,
      error: '未找到 docker 命令 (已检查 PATH 与常见安装位置)。请安装 Docker Desktop 后点击刷新。'
    };
  } else {
    const r = await runCapture([docker, 'info', '--format', '{{.ServerVersion}}'], 10000);
    if (r.error) status = { ok: false, error: r.error };
    else if (r.code === 0) status = { ok: true, version: r.stdout.trim() };
    else
      status = {
        ok: false,
        error: (r.stderr || r.stdout).trim().slice(0, 300) || 'docker info 失败 (守护进程未运行?)'
      };
  }
  cache = { ts: now, status };
  return status;
}

export async function dockerImages(): Promise<DockerImage[]> {
  const docker = findDocker();
  if (!docker) return [];
  const r = await runCapture([
    docker, 'images', '--filter', 'reference=mini-py-pack/*', '--format', '{{json .}}'
  ]);
  if (r.code !== 0) return [];
  const out: DockerImage[] = [];
  for (const line of r.stdout.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const d = JSON.parse(t) as Record<string, string>;
      out.push({
        repository: d.Repository ?? '',
        tag: d.Tag ?? '',
        size: d.Size ?? '',
        created: d.CreatedSince ?? ''
      });
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}

export async function containerIds(): Promise<Set<string>> {
  const docker = findDocker();
  if (!docker) return new Set();
  const r = await runCapture([docker, 'ps', '-aq']);
  return r.code === 0 ? new Set(r.stdout.split(/\s+/).filter(Boolean)) : new Set();
}

export async function cleanupNewContainers(before: Set<string>, image: string): Promise<string[]> {
  const removed: string[] = [];
  const docker = findDocker();
  if (!docker) return removed;
  const r = await runCapture([docker, 'ps', '-aq', '--filter', `ancestor=${image}`]);
  if (r.code !== 0) return removed;
  for (const cid of r.stdout.split(/\s+/).filter(Boolean)) {
    if (!before.has(cid)) {
      const rm = await runCapture([docker, 'rm', '-f', cid], 30000);
      if (rm.code === 0) removed.push(cid);
    }
  }
  return removed;
}