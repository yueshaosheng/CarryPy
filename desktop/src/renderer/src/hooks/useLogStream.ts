import { useCallback, useEffect, useRef, useState } from 'react';
import { TaskStatus } from '@shared/types';
import { RUNNING_STATUSES } from '@shared/types';

const MAX_LINES = 5000;
const encoder = new TextEncoder();

export interface LogStream {
  lines: string[];
  status: TaskStatus | null;
}

/** 日志流: 进入时全量读文件, running 时挂增量推送并做字节 offset 对账。
 *  lines 的最后一个元素是当前未完结行, 随增量即时合并显示。 */
export function useLogStream(taskId: string | null): LogStream {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const offsetRef = useRef(0);

  const pushText = useCallback((text: string) => {
    if (!text) return;
    setLines((prev) => {
      const base = prev.length > 0 ? prev.slice(0, -1) : [];
      const tail = prev.length > 0 ? prev[prev.length - 1] : '';
      const parts = (tail + text).split('\n');
      const next = [...base, ...parts];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);

  useEffect(() => {
    if (!taskId) return;
    let disposed = false;
    const cleanupFns: Array<() => void> = [];
    offsetRef.current = 0;
    setLines([]);
    setStatus(null);

    const reconcile = async (): Promise<void> => {
      const chunk = await window.carrypy.readLog(taskId, offsetRef.current);
      if (disposed || !chunk) return;
      pushText(chunk.text);
      offsetRef.current = chunk.offset;
      setStatus(chunk.status);
    };

    void (async () => {
      const chunk = await window.carrypy.readLog(taskId, 0);
      if (disposed || !chunk) return;
      pushText(chunk.text);
      offsetRef.current = chunk.offset;
      setStatus(chunk.status);
      if (!RUNNING_STATUSES.includes(chunk.status)) return;

      const offLog = window.carrypy.onTaskLog((event) => {
        if (event.id !== taskId || disposed) return;
        const expectedPrev = event.offset - encoder.encode(event.text).length;
        if (expectedPrev !== offsetRef.current) {
          void reconcile();
          return;
        }
        pushText(event.text);
        offsetRef.current = event.offset;
        setStatus(event.status);
      });
      const offUpdated = window.carrypy.onTaskUpdated((task) => {
        if (task.id !== taskId || disposed) return;
        setStatus(task.status);
        if (!RUNNING_STATUSES.includes(task.status)) {
          void reconcile();
          offLog();
          offUpdated();
        }
      });
      cleanupFns.push(offLog, offUpdated);
    })();

    return () => {
      disposed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [taskId, pushText]);

  return { lines, status };
}