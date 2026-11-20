import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Table, Typography } from '@arco-design/web-react';
import { Refresh } from '@icon-park/react';
import { DockerImage } from '@shared/types';
import { useDocker } from '@renderer/state/DockerContext';
import EmptyState from '@renderer/components/EmptyState';

export default function DockerPage(): React.ReactNode {
  const { status, refresh } = useDocker();
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      setImages(await window.carrypy.dockerImages());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  return (
    <div className="page-scroll">
      <div className="page-head">
        <h1>Docker</h1>
        <span className="sub">构建引擎状态与镜像</span>
        <div style={{ flex: 1 }} />
        <Button
          size="small"
          icon={<Refresh />}
          loading={loading}
          onClick={() => {
            void refresh();
            void loadImages();
          }}
        >
          刷新
        </Button>
      </div>

      {status && !status.ok && (
        <Alert
          type="error"
          title="Docker 不可用"
          content={
            status.error?.includes('未找到 docker 命令') ? (
              <span>
                {status.error} 已检查 PATH 与常见安装位置 (/usr/local/bin、/opt/homebrew/bin、~/.docker/bin、Docker.app 内置)。
                安装后点击刷新即可，无需重启应用。
              </span>
            ) : (
              <span>
                {status.error ?? '未知错误'} — 请启动 Docker Desktop（macOS: <code>open -a Docker</code>），
                用 <code>docker info</code> 验证后点击刷新。构建功能需要 Docker 守护进程运行。
              </span>
            )
          }
          style={{ marginBottom: 16 }}
        />
      )}
      {status?.ok && (
        <Alert
          type="success"
          title={`Docker 运行中 · 版本 ${status.version}`}
          content={`已有 ${images.length} 个 CarryPy 构建镜像，增量包构建会复用它们。`}
          style={{ marginBottom: 16 }}
        />
      )}

      {images.length === 0 ? (
        <div className="cp-card">
          <EmptyState title="暂无构建镜像" hint="首次构建某平台时会自动创建 mini-py-pack/<平台> 镜像" />
        </div>
      ) : (
        <Table
          className="cp-card"
          rowKey={(r) => `${r.repository}:${r.tag}`}
          data={images}
          loading={loading}
          pagination={false}
          size="small"
          columns={[
            { title: '镜像', dataIndex: 'repository', render: (v: string) => <span className="mono">{v}</span> },
            { title: '标签', dataIndex: 'tag', width: 100, render: (v: string) => <span className="mono">{v}</span> },
            { title: '大小', dataIndex: 'size', width: 110 },
            { title: '创建', dataIndex: 'created', width: 150 }
          ]}
        />
      )}
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
        镜像缺失时 build_addon.sh 会自动以空包模式补建构建环境。
      </Typography.Text>
    </div>
  );
}