import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '@renderer/components/AppShell';
import BuildPage from '@renderer/pages/build/BuildPage';
import TasksPage from '@renderer/pages/tasks/TasksPage';
import TaskDetailPage from '@renderer/pages/tasks/TaskDetailPage';
import ArtifactsPage from '@renderer/pages/artifacts/ArtifactsPage';
import DockerPage from '@renderer/pages/docker/DockerPage';
import SettingsPage from '@renderer/pages/settings/SettingsPage';

export default function Router(): React.ReactNode {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/build" replace />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/docker" element={<DockerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/build" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}