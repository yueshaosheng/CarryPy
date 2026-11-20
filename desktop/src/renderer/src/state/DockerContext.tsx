import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { DockerStatus } from '@shared/types';

interface DockerCtx {
  status: DockerStatus | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DockerCtx>({ status: null, refresh: async () => {} });

export function DockerProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const refresh = useCallback(async () => {
    try {
      setStatus(await window.carrypy.dockerStatus());
    } catch {
      setStatus({ ok: false, error: 'IPC 不可用' });
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  return <Ctx.Provider value={{ status, refresh }}>{children}</Ctx.Provider>;
}

export function useDocker(): DockerCtx {
  return useContext(Ctx);
}