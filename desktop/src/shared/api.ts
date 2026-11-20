import {
  AppInfo,
  CreateResult,
  DistFile,
  DockerImage,
  DockerStatus,
  GuiRelease,
  LogChunk,
  PlatformInfo,
  Presets,
  Settings,
  Task,
  TaskLogEvent,
  ThemeMode,
  BuildParams
} from './types';

export interface CarryPyApi {
  getInfo(): Promise<AppInfo>;
  copyText(text: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  listPlatforms(): Promise<PlatformInfo[]>;
  getPresets(platform: string): Promise<Presets>;
  dockerStatus(): Promise<DockerStatus>;
  dockerImages(): Promise<DockerImage[]>;
  listTasks(limit?: number): Promise<Task[]>;
  getTask(id: string): Promise<(Task & { log_size: number }) | null>;
  createTask(params: BuildParams): Promise<CreateResult>;
  cancelTask(id: string): Promise<{ result: string }>;
  readLog(id: string, offset: number): Promise<LogChunk | null>;
  exportLog(id: string): Promise<{ saved: boolean; path?: string }>;
  listDist(): Promise<DistFile[]>;
  saveDist(name: string): Promise<{ saved: boolean; path?: string }>;
  revealDist(name: string): Promise<void>;
  deleteDist(name: string): Promise<{ deleted: string }>;
  restoreDist(name: string): Promise<{ restored: string }>;
  getSettings(): Promise<Settings>;
  chooseDistDir(): Promise<Settings | null>;
  setTheme(theme: ThemeMode): Promise<Settings>;
  getRelease(force?: boolean): Promise<GuiRelease>;
  onTaskUpdated(cb: (task: Task) => void): () => void;
  onTaskLog(cb: (event: TaskLogEvent) => void): () => void;
  onThemeChanged(cb: (dark: boolean) => void): () => void;
}