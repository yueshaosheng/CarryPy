import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tooltip } from '@arco-design/web-react';
import {
  Code,
  ListView,
  FolderOpen,
  Download,
  SettingTwo,
  Ship,
  Sun,
  Moon,
  Computer
} from '@icon-park/react';
import { useSettings } from '@renderer/state/SettingsContext';
import { useTasks } from '@renderer/state/TasksContext';
import { useDocker } from '@renderer/state/DockerContext';

const NAV = [
  { path: '/build', label: '构建', icon: Code },
  { path: '/tasks', label: '任务', icon: ListView },
  { path: '/artifacts', label: '产物', icon: FolderOpen },
  { path: '/docker', label: 'Docker', icon: Ship },
  { path: '/download', label: '下载', icon: Download },
  { path: '/settings', label: '设置', icon: SettingTwo }
];

function Logo(): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect x="2" y="7" width="22" height="15" rx="2.5" fill="var(--color-fill-2)" stroke="rgb(var(--primary-6))" strokeWidth="1.4" />
      <path d="M6 11v7M10 11v7M14 11v7M18 11v7M22 11v7" stroke="var(--color-border-3)" strokeWidth="1.3" />
      <path d="M9 4.5h5.2a2.3 2.3 0 0 1 2.3 2.3V9H9.8A2.3 2.3 0 0 1 7.5 6.8V6a1.5 1.5 0 0 1 1.5-1.5z" fill="#3776ab" />
      <path d="M17 21.5h-5.2a2.3 2.3 0 0 1-2.3-2.3V17h7.2a2.3 2.3 0 0 1 2.3 2.3v.7a1.5 1.5 0 0 1-1.5 1.5z" fill="#ffd43b" />
      <circle cx="10.6" cy="6.4" r=".9" fill="var(--color-bg-2)" />
      <circle cx="15.4" cy="19.6" r=".9" fill="var(--color-bg-2)" />
    </svg>
  );
}

export default function AppShell({ children }: { children: ReactNode }): ReactNode {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, setTheme } = useSettings();
  const { running } = useTasks();
  const { status, refresh } = useDocker();

  const active = (path: string): boolean =>
    path === '/tasks' ? location.pathname.startsWith('/tasks') : location.pathname === path;

  const cycleTheme = (): void => {
    const cur = settings?.theme ?? 'light';
    const next = cur === 'light' ? 'dark' : cur === 'dark' ? 'system' : 'light';
    void setTheme(next);
  };
  const ThemeIcon = settings?.theme === 'dark' ? Moon : settings?.theme === 'system' ? Computer : Sun;

  return (
    <div className="app-shell">
      <nav className="side-nav">
        <div className="drag-top" />
        <div className="brand-row">
          <Logo />
          <span className="brand-serif">CarryPy</span>
          <span className="brand-tag">GUI</span>
        </div>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.path}
              className={`nav-item${active(item.path) ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={16} />
              {item.label}
            </div>
          );
        })}
        <div className="nav-footer">
          {running && (
            <div
              className="docker-pill"
              style={{ color: 'rgb(var(--warning-6))', borderColor: 'rgb(var(--warning-6) / .4)' }}
              onClick={() => navigate(`/tasks/${running.id}`)}
            >
              <span className="pulse-dot" />
              构建中 · {running.platform}
            </div>
          )}
          <Tooltip content={status?.ok ? 'Docker 运行中, 点击刷新' : status?.error ?? '检查中…'}>
            <div
              className={`docker-pill ${status ? (status.ok ? 'ok' : 'bad') : ''}`}
              onClick={() => void refresh()}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
              {status ? (status.ok ? `Docker ${status.version}` : 'Docker 不可用') : 'Docker …'}
            </div>
          </Tooltip>
          <div className="docker-pill" onClick={cycleTheme} title="切换主题">
            <ThemeIcon size={13} />
            {settings?.theme === 'dark' ? '深色' : settings?.theme === 'system' ? '跟随系统' : '浅色'}
          </div>
        </div>
      </nav>
      <div className="content-area">{children}</div>
    </div>
  );
}