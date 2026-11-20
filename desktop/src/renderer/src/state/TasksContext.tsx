import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Task } from '@shared/types';
import { RUNNING_STATUSES } from '@shared/types';

interface TasksCtx {
  tasks: Task[];
  running: Task | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<TasksCtx>({ tasks: [], running: null, refresh: async () => {} });

export function TasksProvider({ children }: { children: ReactNode }): ReactNode {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const refresh = useCallback(async () => {
    try {
      setTasks(await window.carrypy.listTasks(100));
    } catch {
      /* app may be quitting */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const off = window.carrypy.onTaskUpdated((task) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = task;
          return next;
        }
        return [task, ...prev];
      });
    });
    const slow = setInterval(() => void refresh(), 10000);
    return () => {
      off();
      clearInterval(slow);
    };
  }, [refresh]);

  const running = tasks.find((t) => RUNNING_STATUSES.includes(t.status)) ?? null;
  return <Ctx.Provider value={{ tasks, running, refresh }}>{children}</Ctx.Provider>;
}

export function useTasks(): TasksCtx {
  return useContext(Ctx);
}