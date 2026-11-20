import { Button } from '@arco-design/web-react';
import { Box, Layers, Send } from '@icon-park/react';

const STEPS = [
  {
    icon: Box,
    title: '1 · 空包基础包',
    body: 'Python 解释器 + 完整标准库，约 12 MB。解压即用，无需 root、无需安装，可整体移动到任意路径。'
  },
  {
    icon: Layers,
    title: '2 · 增量包按需叠加',
    body: '科学计算套 8 包（numpy / pandas / scipy / scikit-learn / h5py …）或 GUI 套（PyQt6 / PyQt5），完全离线安装并自动冒烟测试。'
  },
  {
    icon: Send,
    title: '3 · 目标机部署',
    body: '拷贝 tar.gz 到目标 Linux 机器：tar xzf 基础包，再运行增量包内 install_addon.sh，一致性校验 + 功能自检自动完成。'
  }
];

export default function QuickStart({ onScience }: { onScience: () => void }): React.ReactNode {
  return (
    <div className="cp-card rise-in" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span className="brand-serif" style={{ fontSize: 18 }}>快速上手</span>
        <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>三步得到可离线部署的 Python 环境</span>
      </div>
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.title}
            className="rise-in"
            style={{
              display: 'flex',
              gap: 14,
              padding: '14px 4px',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-border-1)',
              animationDelay: `${i * 80}ms`
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                flex: 'none',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgb(var(--primary-6) / .1)',
                color: 'rgb(var(--primary-6))'
              }}
            >
              <Icon size={18} />
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.65 }}>{s.body}</div>
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button type="primary" size="small" onClick={onScience}>
          填入科学计算套，开始第一个增量包
        </Button>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>
          产物默认输出到设置中的目录
        </span>
      </div>
    </div>
  );
}