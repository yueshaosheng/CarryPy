import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Collapse,
  Input,
  Message,
  Radio,
  Select,
  Switch,
  Tooltip,
  Typography
} from '@arco-design/web-react';
import { Flask, Pic, Thunderbolt, BookOne, RankingList, AllApplication } from '@icon-park/react';
import { BatchMode, BuildType, EnvKey, ENV_KEYS, PlatformInfo, Presets } from '@shared/types';
import { splitPackages, validPackage, validPython } from '@shared/validation';
import { useTasks } from '@renderer/state/TasksContext';
import TaskCard from '@renderer/components/TaskCard';
import QuickStart from '@renderer/components/QuickStart';
import PackageRanking from '@renderer/components/PackageRanking';
import BatchModal from '@renderer/components/BatchModal';
import EmptyState from '@renderer/components/EmptyState';

const ENV_PLACEHOLDER: Record<EnvKey, string> = {
  APT_MIRROR: '默认 mirrors.aliyun.com',
  PYTHON_MIRROR: '默认 mirrors.huaweicloud.com/python',
  PIP_INDEX_URL: '默认 pypi.tuna.tsinghua.edu.cn/simple',
  PYTHON_BUILD_TAG: 'python-build-standalone 标签 (可选)'
};

export default function BuildPage(): React.ReactNode {
  const navigate = useNavigate();
  const { tasks, running, refresh } = useTasks();
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [platform, setPlatform] = useState('');
  const [presets, setPresets] = useState<Presets | null>(null);
  const [type, setType] = useState<BuildType>('base');
  const [packagesText, setPackagesText] = useState('');
  const [systemText, setSystemText] = useState('');
  const [python, setPython] = useState('');
  const [optimize, setOptimize] = useState(false);
  const [noCache, setNoCache] = useState(false);
  const [env, setEnv] = useState<Partial<Record<EnvKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sysOpen, setSysOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => localStorage.getItem('carrypy.guide') !== '0');
  const [rankOpen, setRankOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const toggleGuide = (): void => {
    setGuideOpen((prev) => {
      localStorage.setItem('carrypy.guide', prev ? '0' : '1');
      return !prev;
    });
  };

  useEffect(() => {
    void window.carrypy.listPlatforms().then((ps) => {
      setPlatforms(ps);
      const saved = localStorage.getItem('carrypy.platform');
      const pick = ps.find((p) => p.name === saved) ?? ps.find((p) => p.name === 'ubuntu22_amd64') ?? ps[0];
      if (pick) setPlatform(pick.name);
    });
  }, []);

  useEffect(() => {
    if (!platform) return;
    localStorage.setItem('carrypy.platform', platform);
    void window.carrypy.getPresets(platform).then(setPresets);
  }, [platform]);

  const current = platforms.find((p) => p.name === platform);
  const badPackages = useMemo(
    () => splitPackages(packagesText).filter((p) => !validPackage(p)),
    [packagesText]
  );
  const pythonBad = python.trim() !== '' && !validPython(python.trim());
  const packagesEmpty = type !== 'base' && splitPackages(packagesText).length === 0;

  const fillScience = useCallback(() => {
    if (presets) setPackagesText(presets.science.packages.join(' '));
  }, [presets]);

  const fillGui = useCallback(() => {
    if (presets?.gui.available) {
      setType('addon');
      setPackagesText(presets.gui.packages.join(' '));
      setSystemText(presets.gui.system_pkgs);
      setSysOpen(true);
    }
  }, [presets]);

  const start = async (): Promise<void> => {
    setFormError('');
    if (type !== 'base' && (badPackages.length > 0 || packagesEmpty)) return;
    if (pythonBad) return;
    setSubmitting(true);
    try {
      const result = await window.carrypy.createTask({
        type,
        platform,
        packages: type === 'base' ? [] : splitPackages(packagesText),
        python: python.trim(),
        optimize: type !== 'addon' && optimize,
        no_cache: type !== 'addon' && noCache,
        system_pkgs: type === 'addon' ? splitPackages(systemText) : [],
        env
      });
      if (result.ok) {
        Message.success(`构建已启动: ${result.task.id}`);
        void refresh();
        navigate(`/tasks/${result.task.id}`);
      } else if (result.running_task) {
        Message.info('已有构建进行中, 已跳转到该任务');
        navigate(`/tasks/${result.running_task.id}`);
      } else {
        setFormError(result.error);
      }
    } catch (e) {
      setFormError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const addPackage = useCallback((name: string) => {
    if (type === 'base') setType('addon');
    setPackagesText((prev) => {
      const list = splitPackages(prev);
      if (list.some((p) => p.replace(/[=<>!~].*/, '') === name)) return prev;
      return [...list, name].join(' ');
    });
  }, [type]);

  const startBatch = async (mode: BatchMode, platforms: string[]): Promise<void> => {
    setBatchOpen(false);
    const result = await window.carrypy.createBatch({
      mode,
      platforms,
      current: mode === 'current'
        ? {
            type, platform,
            packages: type === 'base' ? [] : splitPackages(packagesText),
            python: python.trim(),
            optimize: type !== 'addon' && optimize,
            no_cache: type !== 'addon' && noCache,
            system_pkgs: type === 'addon' ? splitPackages(systemText) : [],
            env
          }
        : { type: 'base', platform: '', packages: [], python: python.trim(), optimize, no_cache: noCache, system_pkgs: [], env }
    });
    if (result.ok) {
      Message.success(`已加入 ${result.tasks.length} 个平台构建队列`);
      void refresh();
      navigate('/tasks');
    } else {
      Message.error(result.error);
    }
  };

  const recent = tasks.slice(0, 6);

  return (
    <div className="page-scroll">
      <div className="page-head">
        <h1>构建</h1>
        <span className="sub">为任意 Linux 发行版打包最小化 Python 环境</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 430px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <Card className="cp-card rise-in" title="构建配置" size="small">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>目标平台</Typography.Text>
              <Select
                value={platform}
                onChange={setPlatform}
                style={{ width: '100%', marginTop: 6 }}
                showSearch
                filterOption={(input, option) =>
                  String((option as { props?: { value?: string } })?.props?.value ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {platforms.map((p) => (
                  <Select.Option key={p.name} value={p.name}>
                    {p.name} ({p.base_image} · py{p.python_version})
                  </Select.Option>
                ))}
              </Select>
              {current && (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                  {current.base_image} · {current.docker_platform} · Python {current.python_version}
                </Typography.Text>
              )}
            </div>

            <Radio.Group
              type="button"
              value={type}
              onChange={setType}
              options={[
                { label: '空包基础包', value: 'base' },
                { label: '带包全量包', value: 'full' },
                { label: '增量包', value: 'addon' }
              ]}
            />

            {type !== 'base' && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button size="small" icon={<Flask />} onClick={fillScience}>科学计算套</Button>
                  <Button size="small" icon={<RankingList />} onClick={() => setRankOpen(true)}>热门包榜</Button>
                  <Tooltip content={presets?.gui.available ? '填入 GUI 包与系统库清单' : presets?.gui.reason ?? ''}>
                    <span>
                      <Button size="small" icon={<Pic />} disabled={!presets?.gui.available} onClick={fillGui}>
                        GUI 套
                      </Button>
                    </span>
                  </Tooltip>
                  {!presets?.gui.available && presets?.gui.reason && (
                    <Typography.Text type="secondary" style={{ fontSize: 11.5 }}>
                      {presets.gui.reason}
                    </Typography.Text>
                  )}
                </div>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Python 包 (空格或换行分隔, 可带版本约束如 scikit-learn==1.3.2)
                  </Typography.Text>
                  <Input.TextArea
                    value={packagesText}
                    onChange={setPackagesText}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
                    placeholder="numpy pandas scipy"
                  />
                  {badPackages.length > 0 && (
                    <Typography.Text type="error" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      包名非法: {badPackages.join(' ')}
                    </Typography.Text>
                  )}
                </div>
              </>
            )}

            {type === 'addon' && (
              <Collapse
                bordered={false}
                style={{ background: 'var(--color-fill-1)', borderRadius: 8 }}
                activeKey={sysOpen ? ['sys'] : []}
                onChange={(_key, keys) => setSysOpen(keys.includes('sys'))}
              >
                <Collapse.Item header="系统包 (--system-pkgs, 可选)" name="sys">
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                    仅 GUI 类 wheel (PyQt 等) 需要：把目标机可能缺失的系统图形库 (glib/GL/X11 等)
                    随增量包携带，安装时自动落到环境 lib/。科学计算套与普通包无需填写，留空即可；
                    GUI 套预设会自动填入对应平台的清单。
                  </Typography.Paragraph>
                  <Input.TextArea
                    value={systemText}
                    onChange={setSystemText}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}
                    placeholder="libgl1 libegl1 …"
                  />
                </Collapse.Item>
              </Collapse>
            )}

            <Collapse bordered={false} style={{ background: 'var(--color-fill-1)', borderRadius: 8 }}>
              <Collapse.Item header="高级选项" name="adv">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>Python 版本覆盖</Typography.Text>
                    <Input
                      value={python}
                      onChange={setPython}
                      placeholder="如 3.12 (默认取平台配置)"
                      style={{ marginTop: 6 }}
                      status={pythonBad ? 'error' : undefined}
                    />
                    {pythonBad && (
                      <Typography.Text type="error" style={{ fontSize: 12 }}>格式应为 3.11 或 3.11.16</Typography.Text>
                    )}
                  </div>
                  {type !== 'addon' && (
                    <>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                        <Switch size="small" checked={optimize} onChange={setOptimize} />
                        --optimize (PGO+LTO, 慢 20~40 分钟)
                      </label>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                        <Switch size="small" checked={noCache} onChange={setNoCache} />
                        --no-cache (不使用 Docker 缓存)
                      </label>
                    </>
                  )}
                  {ENV_KEYS.map((k) => (
                    <div key={k}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{k}</Typography.Text>
                      <Input
                        value={env[k] ?? ''}
                        onChange={(v) => setEnv((prev) => ({ ...prev, [k]: v }))}
                        placeholder={ENV_PLACEHOLDER[k]}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  ))}
                </div>
              </Collapse.Item>
            </Collapse>

            <Button
              type="primary"
              size="large"
              long
              icon={<Thunderbolt />}
              loading={submitting}
              disabled={!!running || (type !== 'base' && (badPackages.length > 0 || packagesEmpty)) || pythonBad}
              onClick={() => void start()}
            >
              {running ? '构建进行中…' : '开始构建'}
            </Button>
            <Button
              size="large"
              long
              icon={<AllApplication />}
              disabled={!!running}
              onClick={() => setBatchOpen(true)}
            >
              一键为所有平台构建
            </Button>
            {formError && <Typography.Text type="error" style={{ fontSize: 12 }}>{formError}</Typography.Text>}
          </div>
        </Card>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              最近任务
            </Typography.Text>
            <div style={{ flex: 1 }} />
            <Button
              size="mini"
              type={guideOpen ? 'primary' : 'outline'}
              icon={<BookOne />}
              onClick={toggleGuide}
            >
              快速上手
            </Button>
          </div>
          {guideOpen && (
            <div style={{ marginBottom: recent.length > 0 ? 14 : 0 }}>
              <QuickStart
                onScience={() => {
                  setType('addon');
                  fillScience();
                }}
              />
            </div>
          )}
          {recent.length === 0
            ? !guideOpen && (
                <div className="cp-card">
                  <EmptyState title="暂无构建任务" hint="在左侧选择平台与构建类型，点击「开始构建」" />
                </div>
              )
            : recent.map((t, i) => <TaskCard key={t.id} task={t} index={i} />)}
        </div>
      </div>
      <PackageRanking visible={rankOpen} onClose={() => setRankOpen(false)} onAdd={addPackage} />
      <BatchModal
        visible={batchOpen}
        platforms={platforms}
        onCancel={() => setBatchOpen(false)}
        onOk={(mode, pfs) => void startBatch(mode, pfs)}
      />
    </div>
  );
}