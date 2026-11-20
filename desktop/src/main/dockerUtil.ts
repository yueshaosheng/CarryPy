import { DockerImage, DockerStatus } from '@shared/types';
import { runCapture } from './proc';

let cache: { ts: number; status: DockerStatus } | null = null;

export async function dockerStatus(): Promise<DockerStatus> {
  const now = Date.now();
  if (cache && now - cache.ts < 5000) return cache.status;
  const r = await runCapture(['docker', 'info', '--format', '{{.ServerVersion}}'], 10000);
  let status: DockerStatus;
  if (r.error) status = { ok: false, error: r.error };
  else if (r.code === 0) status = { ok: true, version: r.stdout.trim() };
  else status = { ok: false, error: (r.stderr || r.stdout).trim().slice(0, 300) };
  cache = { ts: now, status };
  return status;
}

export async function dockerImages(): Promise<DockerImage[]> {
  const r = await runCapture([
    'docker', 'images', '--filter', 'reference=mini-py-pack/*', '--format', '{{json .}}'
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
  const r = await runCapture(['docker', 'ps', '-aq']);
  return r.code === 0 ? new Set(r.stdout.split(/\s+/).filter(Boolean)) : new Set();
}

export async function cleanupNewContainers(before: Set<string>, image: string): Promise<string[]> {
  const removed: string[] = [];
  const r = await runCapture(['docker', 'ps', '-aq', '--filter', `ancestor=${image}`]);
  if (r.code !== 0) return removed;
  for (const cid of r.stdout.split(/\s+/).filter(Boolean)) {
    if (!before.has(cid)) {
      const rm = await runCapture(['docker', 'rm', '-f', cid], 30000);
      if (rm.code === 0) removed.push(cid);
    }
  }
  return removed;
}