import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { StringDecoder } from 'string_decoder';
import { BuildParams, CreateResult, LogChunk, Task, TaskStatus } from '@shared/types';
import { RUNNING_STATUSES } from '@shared/types';
import * as dockerUtil from './dockerUtil';
import * as logHub from './logHub';
import { imageTag, parseConf } from './platformConf';
import { getDistDir, getRootDir } from './settings';
import { logPath, stateDir } from './runtime';

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const MAX_TASKS = 100;

export function addonArtifactName(platform: string, packages: string[]): string {
  const tags = packages.map((p) => {
    let clean = p.replace(/[=<>!~].*/, '');
    clean = clean.replace(/[^A-Za-z0-9._-]/g, '-');
    return clean;
  });
  return `addon-${platform}-${tags.join('+')}.tar.gz`;
}

export function buildArgv(root: string, params: BuildParams): string[] {
  const script = params.type === 'addon' ? 'build_addon.sh' : 'build.sh';
  const argv = [path.join(root, script), '-p', params.platform];
  if (params.python) argv.push('--python', params.python);
  if (params.type === 'base') {
    argv.push('--packages', '');
  } else if (params.type === 'full') {
    argv.push('--packages', params.packages.join(' '));
  } else {
    if (params.system_pkgs.length > 0) argv.push('--system-pkgs', params.system_pkgs.join(' '));
    argv.push(...params.packages);
  }
  if (params.type !== 'addon') {
    if (params.optimize) argv.push('--optimize');
    if (params.no_cache) argv.push('--no-cache');
  }
  return argv;
}

/** Windows 下探测 Git Bash 以执行 bash 构建脚本; 其他平台直接执行。 */
export function findBash(): string | null {
  if (process.platform !== 'win32') return null;
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe'
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  const pathDirs = (process.env.PATH ?? '').split(path.delimiter);
  for (const dir of pathDirs) {
    const c = path.join(dir, 'bash.exe');
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function cleanChunk(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(ANSI, '');
}

export class TaskManager {
  private tasks = new Map<string, Task>();
  private order: string[] = [];
  private procs = new Map<string, ChildProcess>();
  private cancelFlags = new Map<string, boolean>();

  constructor() {
    this.load();
  }

  private tasksPath(): string {
    return path.join(stateDir(), 'tasks.json');
  }

  private load(): void {
    let data: { tasks?: Task[] };
    try {
      data = JSON.parse(fs.readFileSync(this.tasksPath(), 'utf-8'));
    } catch {
      return;
    }
    for (const t of data.tasks ?? []) {
      if (RUNNING_STATUSES.includes(t.status)) {
        t.status = 'interrupted';
        t.note = 'GUI 服务重启, docker 侧可能仍在构建, 请检查镜像/容器列表';
        t.finished_at = Date.now() / 1000;
      }
      this.tasks.set(t.id, t);
      this.order.push(t.id);
    }
    this.persist();
  }

  private persist(): void {
    const tmp = this.tasksPath() + '.tmp';
    fs.writeFileSync(
      tmp,
      JSON.stringify({ tasks: this.order.map((id) => this.tasks.get(id)) })
    );
    fs.renameSync(tmp, this.tasksPath());
  }

  private prune(): void {
    while (this.order.length > MAX_TASKS) {
      const id = this.order.shift();
      if (!id) break;
      this.tasks.delete(id);
      try {
        fs.unlinkSync(logPath(id));
      } catch {
        /* log may not exist */
      }
    }
  }

  get(id: string): Task | null {
    const t = this.tasks.get(id);
    return t ? { ...t } : null;
  }

  list(limit = 50): Task[] {
    return this.order
      .slice(-Math.min(limit, MAX_TASKS))
      .reverse()
      .map((id) => ({ ...(this.tasks.get(id) as Task) }));
  }

  runningTask(): Task | null {
    for (const t of this.tasks.values()) {
      if (RUNNING_STATUSES.includes(t.status)) return { ...t };
    }
    return null;
  }

  readLog(id: string, offset: number): LogChunk | null {
    const t = this.tasks.get(id);
    if (!t) return null;
    let size = 0;
    let data = Buffer.alloc(0);
    try {
      const fd = fs.openSync(logPath(id), 'r');
      try {
        size = fs.fstatSync(fd).size;
        const start = Math.max(0, Math.min(offset, size));
        const len = size - start;
        data = Buffer.alloc(len);
        fs.readSync(fd, data, 0, len, start);
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      size = 0;
    }
    return {
      offset: offset + data.length,
      log_size: size,
      text: data.toString('utf-8'),
      status: t.status
    };
  }

  create(params: BuildParams): CreateResult {
    const busy = this.runningTask();
    if (busy) return { ok: false, error: '已有构建进行中', running_task: busy };
    const root = getRootDir();
    const id = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
    const argv = buildArgv(root, params);
    const conf = parseConf(path.join(root, 'config', `${params.platform}.conf`));
    const pyver = params.python || conf.PYTHON_VERSION || '';
    const image = imageTag(params.platform, pyver);
    const expected =
      params.type === 'addon' ? addonArtifactName(params.platform, params.packages) : null;
    const task: Task = {
      id,
      type: params.type,
      platform: params.platform,
      params,
      argv,
      image,
      status: 'running',
      created_at: Date.now() / 1000,
      finished_at: null,
      exit_code: null,
      expected_artifact: expected,
      artifact: null,
      note: null
    };
    this.tasks.set(id, task);
    this.order.push(id);
    this.prune();
    this.persist();
    logHub.resetTask(id);
    logHub.taskUpdated(task);
    void this.run(task);
    return { ok: true, task: { ...task } };
  }

  private appendLog(id: string, text: string): void {
    const t = this.tasks.get(id);
    if (!t) return;
    fs.appendFileSync(logPath(id), text);
    logHub.append(id, text, t.status);
  }

  private async run(task: Task): Promise<void> {
    const id = task.id;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      TERM: 'dumb',
      ...task.params.env
    };
    const before = await dockerUtil.containerIds();

    let child: ChildProcess;
    const bash = findBash();
    try {
      if (bash) {
        const posixScript = task.argv[0].replace(/\\/g, '/');
        child = spawn(bash, [posixScript, ...task.argv.slice(1)], {
          cwd: getRootDir(),
          env,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        child = spawn(task.argv[0], task.argv.slice(1), {
          cwd: getRootDir(),
          env,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }
    } catch (e) {
      this.appendLog(id, `[GUI] 启动失败: ${String(e)}\n`);
      this.finish(id, 'failed', null);
      return;
    }
    this.procs.set(id, child);
    task.pid = child.pid;
    this.persist();

    const decOut = new StringDecoder('utf-8');
    const decErr = new StringDecoder('utf-8');
    child.stdout?.on('data', (d: Buffer) => this.appendLog(id, cleanChunk(decOut.write(d))));
    child.stderr?.on('data', (d: Buffer) => this.appendLog(id, cleanChunk(decErr.write(d))));

    const code = await new Promise<number | null>((resolve) => {
      child.on('error', (e) => {
        this.appendLog(id, `[GUI] 进程错误: ${e.message}\n`);
        resolve(null);
      });
      child.on('close', (c) => resolve(c));
    });
    const tailOut = decOut.end();
    const tailErr = decErr.end();
    if (tailOut) this.appendLog(id, cleanChunk(tailOut));
    if (tailErr) this.appendLog(id, cleanChunk(tailErr));
    this.procs.delete(id);
    const cancelled = this.cancelFlags.get(id) ?? false;
    this.cancelFlags.delete(id);

    if (cancelled) {
      const removed = await dockerUtil.cleanupNewContainers(before, task.image);
      this.appendLog(
        id,
        `[GUI] 任务已取消 (已终止进程组${removed.length ? `, 清理残留容器 ${removed.join(' ')}` : ''})\n`
      );
      this.finish(id, 'cancelled', code);
    } else if (code === 0) {
      this.locateArtifact(task);
      this.finish(id, 'succeeded', code);
    } else {
      this.finish(id, 'failed', code);
    }
  }

  private locateArtifact(task: Task): void {
    const dist = getDistDir();
    if (task.expected_artifact) {
      if (fs.existsSync(path.join(dist, task.expected_artifact))) {
        task.artifact = task.expected_artifact;
      }
      return;
    }
    const prefix = `mini_python-${task.platform}-`;
    let candidates: string[] = [];
    try {
      candidates = fs
        .readdirSync(dist)
        .filter((n) => n.startsWith(prefix) && n.endsWith('.tar.gz'));
    } catch {
      return;
    }
    if (candidates.length === 0) return;
    const stat = (n: string): number => fs.statSync(path.join(dist, n)).mtimeMs / 1000;
    const fresh = candidates.filter((n) => stat(n) >= task.created_at - 2);
    const pool = fresh.length > 0 ? fresh : candidates;
    task.artifact = pool.reduce((a, b) => (stat(a) >= stat(b) ? a : b));
  }

  private finish(id: string, status: TaskStatus, code: number | null): void {
    const t = this.tasks.get(id);
    if (!t) return;
    t.status = status;
    t.exit_code = code;
    t.finished_at = Date.now() / 1000;
    this.persist();
    logHub.taskUpdated(t);
  }

  cancel(id: string): { result: string } {
    const t = this.tasks.get(id);
    if (!t) return { result: 'not_found' };
    if (t.status !== 'running') return { result: `already_${t.status}` };
    t.status = 'cancelling';
    this.cancelFlags.set(id, true);
    this.persist();
    logHub.taskUpdated(t);
    const child = this.procs.get(id);
    if (child?.pid) void this.killTree(child);
    return { result: 'ok' };
  }

  private async killTree(child: ChildProcess): Promise<void> {
    const pid = child.pid;
    if (!pid) return;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    }
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      return;
    }
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }

  cancelRunning(): void {
    const r = this.runningTask();
    if (r) this.cancel(r.id);
  }

  async waitIdle(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (this.runningTask() && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}