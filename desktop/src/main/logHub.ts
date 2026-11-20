import { BrowserWindow } from 'electron';
import { CH } from '@shared/channels';
import { Task, TaskLogEvent, TaskStatus } from '@shared/types';

interface BufferEntry {
  text: string;
  offset: number;
  status: TaskStatus;
}

const buffers = new Map<string, BufferEntry>();
const offsets = new Map<string, number>();
let timer: NodeJS.Timeout | null = null;

function broadcast(event: TaskLogEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(CH.evTaskLog, event);
  }
}

function flush(): void {
  timer = null;
  for (const [id, entry] of buffers) {
    broadcast({ id, offset: entry.offset, text: entry.text, status: entry.status });
  }
  buffers.clear();
}

/** TaskManager 每次落盘后调用; 200ms 合帧广播, offset 为字节偏移。 */
export function append(id: string, text: string, status: TaskStatus): void {
  const bytes = Buffer.byteLength(text, 'utf-8');
  const prev = offsets.get(id) ?? 0;
  const end = prev + bytes;
  offsets.set(id, end);
  const entry = buffers.get(id);
  if (entry) {
    entry.text += text;
    entry.offset = end;
    entry.status = status;
  } else {
    buffers.set(id, { text, offset: end, status });
  }
  if (!timer) timer = setTimeout(flush, 200);
}

export function flushTask(id: string): void {
  const entry = buffers.get(id);
  if (entry) {
    broadcast({ id, offset: entry.offset, text: entry.text, status: entry.status });
    buffers.delete(id);
  }
}

export function taskUpdated(task: Task): void {
  flushTask(task.id);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(CH.evTaskUpdated, task);
  }
}

export function resetTask(id: string): void {
  offsets.delete(id);
  buffers.delete(id);
}