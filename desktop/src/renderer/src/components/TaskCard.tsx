import { useNavigate } from 'react-router-dom';
import { Task, TYPE_LABEL } from '@shared/types';
import StatusBadge from './StatusBadge';
import { fmtDur, fmtTime } from './format';

export default function TaskCard({ task, index = 0 }: { task: Task; index?: number }): React.ReactNode {
  const navigate = useNavigate();
  const pkgs = task.params.packages.join(' ');
  return (
    <div
      className={`task-card s-${task.status} rise-in`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <StatusBadge status={task.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {TYPE_LABEL[task.type]} · {task.platform}
        </div>
        <div
          className="mono"
          style={{
            color: 'var(--color-text-3)',
            fontSize: 11.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {task.id} · {fmtTime(task.created_at)} · {fmtDur(task.created_at, task.finished_at)}
          {pkgs ? ` · ${pkgs}` : ''}
        </div>
      </div>
    </div>
  );
}