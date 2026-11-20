export type BuildType = 'base' | 'full' | 'addon';
export type TaskStatus =
  | 'queued'
  | 'running'
  | 'cancelling'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export const ENV_KEYS = [
  'APT_MIRROR',
  'PYTHON_MIRROR',
  'PIP_INDEX_URL',
  'PYTHON_BUILD_TAG'
] as const;
export type EnvKey = (typeof ENV_KEYS)[number];

export interface BuildParams {
  type: BuildType;
  platform: string;
  packages: string[];
  python: string;
  optimize: boolean;
  no_cache: boolean;
  system_pkgs: string[];
  env: Partial<Record<EnvKey, string>>;
}

export interface Task {
  id: string;
  type: BuildType;
  platform: string;
  params: BuildParams;
  argv: string[];
  image: string;
  status: TaskStatus;
  created_at: number;
  finished_at: number | null;
  exit_code: number | null;
  expected_artifact: string | null;
  artifact: string | null;
  note: string | null;
  pid?: number;
  batch_id?: string | null;
}

export interface PlatformInfo {
  name: string;
  base_image: string;
  docker_platform: string;
  python_version: string;
  default_packages: string[];
}

export interface GuiPreset {
  available: boolean;
  reason?: string;
  packages: string[];
  system_pkgs: string;
}

export interface Presets {
  science: { packages: string[] };
  gui: GuiPreset;
}

export interface DockerStatus {
  ok: boolean;
  version?: string;
  error?: string;
}

export interface DockerImage {
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface DistFile {
  name: string;
  size: number;
  mtime: number;
  kind: 'base' | 'addon';
}

export interface LogChunk {
  offset: number;
  log_size: number;
  text: string;
  status: TaskStatus;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  dist_dir: string;
  theme: ThemeMode;
  editable: boolean;
  frozen: boolean;
  version: string;
  root: string;
  state_dir: string;
}

export interface AppInfo {
  version: string;
  platform: NodeJS.Platform;
  arch: string;
  isPackaged: boolean;
  rosetta: boolean;
  bashAvailable: boolean;
}

export type ReleaseOS = 'mac' | 'win' | 'linux';
export type ReleaseArch = 'arm64' | 'x64';
export type ReleaseFormat = 'dmg' | 'exe' | 'deb' | 'AppImage';

export interface ReleaseAsset {
  name: string;
  url: string;
  size: number;
  os: ReleaseOS;
  arch: ReleaseArch;
  format: ReleaseFormat;
}

export interface GuiRelease {
  tag: string;
  version: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
  source: 'github' | 'bundled';
}

export type CreateResult =
  | { ok: true; task: Task }
  | { ok: false; error: string; running_task?: Task };

export interface TaskLogEvent {
  id: string;
  offset: number;
  text: string;
  status: TaskStatus;
}

export const RUNNING_STATUSES: TaskStatus[] = ['running', 'cancelling'];
export const ACTIVE_STATUSES: TaskStatus[] = ['queued', 'running', 'cancelling'];

export type BatchMode = 'base' | 'science' | 'current';

export interface BatchRequest {
  mode: BatchMode;
  platforms: string[];
  current?: BuildParams;
}

export type BatchResult =
  | { ok: true; batch_id: string; tasks: Task[] }
  | { ok: false; error: string };

export const STATUS_LABEL: Record<TaskStatus, string> = {
  queued: '排队中',
  running: '运行中',
  cancelling: '取消中',
  succeeded: '成功',
  failed: '失败',
  cancelled: '已取消',
  interrupted: '已中断'
};

export const TYPE_LABEL: Record<BuildType, string> = {
  base: '空包基础包',
  full: '全量包',
  addon: '增量包'
};