import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { SettingsProvider } from '@renderer/state/SettingsContext';
import { TasksProvider } from '@renderer/state/TasksContext';
import { DockerProvider } from '@renderer/state/DockerContext';
import Router from './router';

export default function App(): React.ReactNode {
  return (
    <ConfigProvider locale={zhCN}>
      <SettingsProvider>
        <TasksProvider>
          <DockerProvider>
            <Router />
          </DockerProvider>
        </TasksProvider>
      </SettingsProvider>
    </ConfigProvider>
  );
}