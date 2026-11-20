import { spawn } from 'child_process';

export interface CaptureResult {
  code: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

/** 列表 argv 执行并收集输出; 超时杀进程; ENOENT 归类为未安装。 */
export function runCapture(argv: string[], timeoutMs = 15000): Promise<CaptureResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: null, stdout: '', stderr: '', error: String(e) });
      return;
    }
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already exited */
      }
    }, timeoutMs);
    const finish = (result: CaptureResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf-8');
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf-8');
    });
    child.on('error', (e: NodeJS.ErrnoException) => {
      finish({
        code: null,
        stdout,
        stderr,
        error: e.code === 'ENOENT' ? '未安装 docker' : e.message
      });
    });
    child.on('close', (code) => finish({ code, stdout, stderr }));
  });
}