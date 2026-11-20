import { Tag } from '@arco-design/web-react';
import { TaskStatus, STATUS_LABEL, RUNNING_STATUSES } from '@shared/types';

const COLOR: Record<TaskStatus, string> = {
  queued: 'arcoblue',
  running: 'orangered',
  cancelling: 'orangered',
  succeeded: 'green',
  failed: 'red',
  cancelled: 'red',
  interrupted: 'gray'
};

export default function StatusBadge({ status }: { status: TaskStatus }): React.ReactNode {
  const running = RUNNING_STATUSES.includes(status);
  return (
    <Tag color={COLOR[status]} size="small" style={{ borderRadius: 20 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {running && <span className="pulse-dot" />}
        {STATUS_LABEL[status]}
      </span>
    </Tag>
  );
}