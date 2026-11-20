import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Link, Message, Popconfirm, Typography } from '@arco-design/web-react';
import { ArrowLeft, Download, FolderOpen, Forbid } from '@icon-park/react';
import { Task, TYPE_LABEL } from '@shared/types';
import { RUNNING_STATUSES } from '@shared/types';
import StatusBadge from '@renderer/components/StatusBadge';
import LogTerminal from '@renderer/components/LogTerminal';
import { fmtDur, fmtTime } from '@renderer/components/format';
import { useTasks } from '@renderer/state/TasksContext';

export default function TaskDetailPage(): React.ReactNode {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh } = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    let disposed = false;
    void window.carrypy.getTask(id).then((t) => {
      if (!disposed) setTask(t);
    });
    const off = window.carrypy.onTaskUpdated((t) => {
      if (t.id === id && !disposed) {
        setTask(t);
        if (!RUNNING_STATUSES.includes(t.status)) void refresh();
      }
    });
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      disposed = true;
      off();
      clearInterval(timer);
    };
  }, [id, refresh]);

  if (!id) return null;
  if (!task) {
    return (
      <div className="page-scroll">
        <Typography.Text type="secondary">加载任务…</Typography.Text>
      </div>
    );
  }

  const running = RUNNING_STATUSES.includes(task.status);

  const cancel = async (): Promise<void> => {
    const r = await window.carrypy.cancelTask(task.id);
    if (r.result === 'ok') Message.info('已发送取消');
    else Message.warning(`无法取消: ${r.result}`);
  };

  const exportLog = async (): Promise<void> => {
    const r = await window.carrypy.exportLog(task.id);
    if (r.saved) Message.success(`日志已导出: ${r.path}`);
  };

  return (
    <div className="page-scroll" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-head" style={{ flexWrap: 'wrap' }}>
        <Button size="small" icon={<ArrowLeft />} onClick={() => navigate('/tasks')}>
          返回
        </Button>
        <h1 style={{ fontSize: 16 }}>
          {TYPE_LABEL[task.type]} · {task.platform}
        </h1>
        <StatusBadge status={task.status} />
        <span className="sub mono">
          {task.id} · {fmtTime(task.created_at)} · {fmtDur(task.created_at, task.finished_at)}
          {task.exit_code !== null ? ` · exit ${task.exit_code}` : ''}
        </span>
        <div style={{ flex: 1 }} />
        {running && (
          <Popconfirm
            title="确认取消构建？"
            content="将终止进程组并清理残留容器；若升级为硬杀，BuildKit 可能仍在后台跑完当前层以缓存。"
            onOk={() => void cancel()}
            okButtonProps={{ status: 'danger' }}
          >
            <Button size="small" status="danger" icon={<Forbid />}>取消构建</Button>
          </Popconfirm>
        )}
        <Button size="small" icon={<Download />} onClick={() => void exportLog()}>导出日志</Button>
      </div>

      {task.artifact && (
        <div style={{ marginBottom: 10, fontSize: 13 }}>
          <FolderOpen size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          产物:{' '}
          <Link onClick={() => navigate('/artifacts')} style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
            {task.artifact}
          </Link>
        </div>
      )}
      {task.note && (
        <Typography.Text type="warning" style={{ fontSize: 12.5, display: 'block', marginBottom: 10 }}>
          {task.note}
        </Typography.Text>
      )}

      <LogTerminal taskId={task.id} height="calc(100vh - 230px)" />
    </div>
  );
}