import { Button, Descriptions, Message, Radio, Typography } from '@arco-design/web-react';
import { FolderOpen, Copy } from '@icon-park/react';
import { useSettings } from '@renderer/state/SettingsContext';

export default function SettingsPage(): React.ReactNode {
  const { settings, setTheme, chooseDistDir } = useSettings();
  if (!settings) return <div className="page-scroll">加载设置…</div>;

  const copyPath = async (text: string): Promise<void> => {
    await window.carrypy.copyText(text);
    Message.success('已复制');
  };

  return (
    <div className="page-scroll">
      <div className="page-head">
        <h1>设置</h1>
        <span className="sub">输出目录 · 主题 · 运行信息</span>
      </div>

      <div className="cp-card rise-in" style={{ padding: 20, maxWidth: 760 }}>
        <Descriptions
          column={1}
          colon={false}
          layout="horizontal"
          labelStyle={{ width: 130, color: 'var(--color-text-3)' }}
          data={[
            {
              label: '产物输出目录',
              value: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="mono" style={{ fontSize: 12 }}>{settings.dist_dir}</span>
                  <Button size="mini" icon={<Copy />} onClick={() => void copyPath(settings.dist_dir)} />
                  {settings.editable ? (
                    <Button size="mini" type="primary" icon={<FolderOpen />} onClick={() => void chooseDistDir()}>
                      选择目录
                    </Button>
                  ) : (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      开发态固定为仓库 dist/（打包后可自定义）
                    </Typography.Text>
                  )}
                </span>
              )
            },
            {
              label: '主题',
              value: (
                <Radio.Group
                  type="button"
                  size="small"
                  value={settings.theme}
                  onChange={(v) => void setTheme(v)}
                  options={[
                    { label: '浅色', value: 'light' },
                    { label: '深色', value: 'dark' },
                    { label: '跟随系统', value: 'system' }
                  ]}
                />
              )
            },
            { label: '版本', value: <span className="mono">v{settings.version}{settings.frozen ? ' (打包态)' : ' (开发态)'}</span> },
            {
              label: '构建上下文 ROOT',
              value: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12 }}>{settings.root}</span>
                  <Button size="mini" icon={<Copy />} onClick={() => void copyPath(settings.root)} />
                </span>
              )
            },
            {
              label: '状态目录',
              value: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12 }}>{settings.state_dir}</span>
                  <Button size="mini" icon={<Copy />} onClick={() => void copyPath(settings.state_dir)} />
                </span>
              )
            }
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 12.5, marginTop: 16, marginBottom: 0 }}>
          构建脚本与平台配置内嵌于应用中，首次启动解包到状态目录旁的版本目录；
          产物输出目录通过 ROOT/dist 符号链接指向，切换目录后新构建立即生效。
          任务历史与日志保存在状态目录，升级应用不丢失。
        </Typography.Paragraph>
      </div>
    </div>
  );
}