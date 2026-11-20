import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Message, Popconfirm, Select, Table, Tag } from '@arco-design/web-react';
import { Download, FolderOpen, Delete, Refresh } from '@icon-park/react';
import { DistFile } from '@shared/types';
import { fmtSize, fmtTime } from '@renderer/components/format';
import EmptyState from '@renderer/components/EmptyState';
import { useTasks } from '@renderer/state/TasksContext';

export default function ArtifactsPage(): React.ReactNode {
  const [files, setFiles] = useState<DistFile[]>([]);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'all' | 'base' | 'addon'>('all');
  const { tasks } = useTasks();

  const refresh = useCallback(async () => {
    setFiles(await window.carrypy.listDist());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lastSuccess = tasks.find((t) => t.status === 'succeeded');
  useEffect(() => {
    if (lastSuccess) void refresh();
  }, [lastSuccess?.id, lastSuccess?.status, refresh]);

  const shown = useMemo(
    () =>
      files.filter(
        (f) =>
          (kind === 'all' || f.kind === kind) &&
          f.name.toLowerCase().includes(search.toLowerCase())
      ),
    [files, search, kind]
  );

  const remove = async (name: string): Promise<void> => {
    try {
      await window.carrypy.deleteDist(name);
      void refresh();
      Message.success({
        id: 'artifact-undo',
        duration: 6000,
        content: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            已删除 {name}
            <Button
              size="mini"
              type="text"
              style={{ color: 'rgb(var(--primary-6))', padding: '0 4px' }}
              onClick={() => {
                void (async () => {
                  try {
                    await window.carrypy.restoreDist(name);
                    Message.success(`已恢复 ${name}`);
                    void refresh();
                  } catch (e) {
                    Message.error(String(e));
                  }
                })();
              }}
            >
              撤销
            </Button>
          </span>
        )
      });
    } catch (e) {
      Message.error(String(e));
    }
  };

  const saveAs = async (name: string): Promise<void> => {
    const r = await window.carrypy.saveDist(name);
    if (r.saved) Message.success(`已另存为: ${r.path}`);
  };

  return (
    <div className="page-scroll">
      <div className="page-head">
        <h1>产物</h1>
        <span className="sub">{files.length} 个文件</span>
        <div style={{ flex: 1 }} />
        <Input.Search
          placeholder="搜索文件名"
          value={search}
          onChange={setSearch}
          style={{ width: 220 }}
          size="small"
          allowClear
        />
        <Select
          value={kind}
          onChange={setKind}
          size="small"
          style={{ width: 120 }}
          options={[
            { label: '全部类型', value: 'all' },
            { label: '基础包', value: 'base' },
            { label: '增量包', value: 'addon' }
          ]}
        />
        <Button size="small" icon={<Refresh />} onClick={() => void refresh()}>刷新</Button>
      </div>

      {shown.length === 0 ? (
        <div className="cp-card">
          <EmptyState title="产物目录为空" hint="构建完成后，tar.gz 产物会出现在这里" />
        </div>
      ) : (
        <Table
          className="cp-card"
          rowKey="name"
          data={shown}
          pagination={{ pageSize: 20, showTotal: true, sizeCanChange: true }}
          size="small"
          columns={[
            {
              title: '文件',
              dataIndex: 'name',
              sorter: (a, b) => a.name.localeCompare(b.name),
              render: (name: string, row: DistFile) => (
                <span className="mono" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                  <Tag size="small" color={row.kind === 'base' ? 'arcoblue' : 'purple'} style={{ marginRight: 8 }}>
                    {row.kind === 'base' ? '基础' : '增量'}
                  </Tag>
                  {name}
                </span>
              )
            },
            {
              title: '大小',
              dataIndex: 'size',
              width: 110,
              sorter: (a, b) => a.size - b.size,
              render: (size: number) => fmtSize(size)
            },
            {
              title: '时间',
              dataIndex: 'mtime',
              width: 130,
              sorter: (a, b) => a.mtime - b.mtime,
              defaultSortOrder: 'descend',
              render: (mtime: number) => fmtTime(mtime)
            },
            {
              title: '操作',
              width: 200,
              render: (_: unknown, row: DistFile) => (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <Button size="mini" icon={<Download />} onClick={() => void saveAs(row.name)}>
                    另存为
                  </Button>
                  <Button size="mini" icon={<FolderOpen />} onClick={() => void window.carrypy.revealDist(row.name)}>
                    文件夹
                  </Button>
                  <Popconfirm
                    title={`确认删除 ${row.name} ?`}
                    content="删除后不可恢复（可重新构建生成）。"
                    onOk={() => void remove(row.name)}
                    okButtonProps={{ status: 'danger' }}
                  >
                    <Button size="mini" status="danger" icon={<Delete />} />
                  </Popconfirm>
                </span>
              )
            }
          ]}
        />
      )}
    </div>
  );
}