import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Settings, ThemeMode } from '@shared/types';

interface SettingsCtx {
  settings: Settings | null;
  dark: boolean;
  setTheme: (t: ThemeMode) => Promise<void>;
  chooseDistDir: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SettingsCtx>({
  settings: null,
  dark: false,
  setTheme: async () => {},
  chooseDistDir: async () => {},
  refresh: async () => {}
});

function applyDark(dark: boolean): void {
  if (dark) document.body.setAttribute('arco-theme', 'dark');
  else document.body.removeAttribute('arco-theme');
}

export function SettingsProvider({ children }: { children: ReactNode }): ReactNode {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dark, setDark] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const s = await window.carrypy.getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    void refresh();
    const off = window.carrypy.onThemeChanged((d) => {
      setDark(d);
      applyDark(d);
    });
    return off;
  }, [refresh]);

  useEffect(() => {
    if (!settings) return;
    const resolve = (): boolean =>
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const d = resolve();
    setDark(d);
    applyDark(d);
  }, [settings]);

  const setTheme = useCallback(async (t: ThemeMode) => {
    const s = await window.carrypy.setTheme(t);
    setSettings(s);
  }, []);

  const chooseDistDir = useCallback(async () => {
    const s = await window.carrypy.chooseDistDir();
    if (s) setSettings(s);
  }, []);

  return (
    <Ctx.Provider value={{ settings, dark, setTheme, chooseDistDir, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings(): SettingsCtx {
  return useContext(Ctx);
}