import { useEffect, useState } from 'react';
import { Alert, Checkbox, Modal, Radio, Typography } from '@arco-design/web-react';
import { BatchMode, PlatformInfo } from '@shared/types';

export default function BatchModal({
  visible,
  platforms,
  onCancel,
  onOk
}: {
  visible: boolean;
  platforms: PlatformInfo[];
  onCancel: () => void;
  onOk: (mode: BatchMode, platforms: string[]) => void;
}): React.ReactNode {
  const [mode, setMode] = useState<BatchMode>('science');
  const [selected, setSelected] = useState<string[]>([]);

  // 每次打开时重置为全选 (组件常驻, 首次挂载时 platforms 可能尚未加载)
  useEffect(() => {
    if (visible) setSelected(platforms.map((p) => p.name));
  }, [visible, platforms]);

  return (
    <Modal
      title="一键为所有平台构建"
      visible={visible}
      onCancel={onCancel}
      onOk={() => onOk(mode, selected)}
      okText={`加入队列 (${selected.length} 个平台)`}
      cancelText="取消"
      okButtonProps={{ disabled: selected.length === 0 }}
      style={{ width: 520 }}
      unmountOnExit
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            构建内容
          </Typography.Text>
          <Radio.Group
            direction="vertical"
            value={mode}
            onChange={setMode}
            options={[
              { label: '科学计算增量包 — 各平台默认包 (centos6 自动使用钉版本组合)', value: 'science' },
              { label: '空包基础包 — 解释器 + 完整标准库', value: 'base' },
              { label: '当前表单配置 — 按左侧填写的包/选项逐平台构建', value: 'current' }
            ]}
          />
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            目标平台
          </Typography.Text>
          <Checkbox.Group
            value={selected}
            onChange={(v) => setSelected(v as string[])}
            options={platforms.map((p) => ({ label: p.name, value: p.name }))}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}
          />
        </div>
        <Alert
          type="info"
          content="任务将串行排队执行，可在「任务」页查看进度或取消整个批次。centos6 为源码编译，单平台可能耗时 30 分钟以上；其余平台命中镜像缓存时每个约 1~5 分钟。"
        />
      </div>
    </Modal>
  );
}