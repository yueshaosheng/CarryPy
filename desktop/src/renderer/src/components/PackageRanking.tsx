import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, Input, Message, Tag, Typography } from '@arco-design/web-react';
import { Plus, Refresh, RankingList } from '@icon-park/react';
import { PackageRanking, fmtDownloads } from '@shared/pypiRanking';

const CATEGORY_COLOR: Record<string, string> = {
  科学计算: 'purple',
  数据处理: 'arcoblue',
  可视化: 'magenta',
  机器学习: 'orangered',
  图像处理: 'cyan',
  Web: 'green',
  数据库: 'gold',
  工具: 'gray',
  测试: 'lime',
  安全: 'red',
  异步: 'blue'
};

export default function PackageRanking({
  visible,
  onClose,
  onAdd
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}): React.ReactNode {
  const [data, setData] = useState<PackageRanking | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      setData(await window.carrypy.getPypiRanking(force));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && !data) void load();
  }, [visible, data, load]);

  const shown = (data?.packages ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.includes(search)
  );

  return (
    <Drawer
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RankingList /> PyPI 热门包榜
        </span>
      }
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={420}
      placement="right"
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0 }}>
        近 30 天下载量排行 · 点击 <Plus size={11} style={{ verticalAlign: -1 }} /> 加入构建包列表
      </Typography.Paragraph>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Input.Search
          placeholder="搜索包名或分类"
          value={search}
          onChange={setSearch}
          allowClear
          size="small"
        />
        <Button size="small" icon={<Refresh />} loading={loading} onClick={() => void load(true)} />
      </div>
      <div>
        {shown.map((p, i) => (
          <div
            key={p.name}
            className="rise-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 6px',
              borderBottom: '1px solid var(--color-border-1)',
              animationDelay: `${Math.min(i, 10) * 25}ms`
            }}
          >
            <span
              className="mono"
              style={{
                width: 26,
                height: 22,
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 700,
                background: i < 3 ? 'rgb(var(--primary-6) / .14)' : 'var(--color-fill-2)',
                color: i < 3 ? 'rgb(var(--primary-6))' : 'var(--color-text-3)'
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 1 }}>
                {fmtDownloads(p.monthly)} 次/月
              </div>
            </div>
            <Tag size="small" color={CATEGORY_COLOR[p.category] ?? 'gray'}>
              {p.category}
            </Tag>
            <Button
              size="mini"
              type="text"
              icon={<Plus />}
              style={{ color: 'rgb(var(--primary-6))' }}
              onClick={() => {
                onAdd(p.name);
                Message.success(`已加入 ${p.name}`);
              }}
            />
          </div>
        ))}
        {shown.length === 0 && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            无匹配结果
          </Typography.Text>
        )}
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 11.5, marginTop: 14, marginBottom: 0 }}>
        数据源 pypistats.org{data?.source === 'live' ? ' · 实时' : ' · 离线参考快照 (2026-11-20)'}
        {data?.source === 'live' && data.fetched_at
          ? ` · 更新于 ${new Date(data.fetched_at).toLocaleTimeString('zh-CN')}`
          : ''}
      </Typography.Paragraph>
    </Drawer>
  );
}