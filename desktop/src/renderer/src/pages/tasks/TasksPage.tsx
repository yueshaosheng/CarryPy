import { useMemo, useState } from 'react';
import { Select } from '@arco-design/web-react';
import { TaskStatus, STATUS_LABEL } from '@shared/types';
import { useTasks } from '@renderer/state/TasksContext';
import TaskCard from '@renderer/components/TaskCard';
import EmptyState from '@renderer/components/EmptyState';

const FILTERS: Array<{ label: string; value: TaskStatus | 'all' }> = [
  { label: '全部状态', value: 'all' },
  ...(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({ label: STATUS_LABEL[s], value: s }))
];

export default function TasksPage(): React.ReactNode {
  const { tasks } = useTasks();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const shown = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter]
  );

  return (
    <div className="page-scroll">
      <div className="page-head">
        <h1>任务</h1>
        <span className="sub">{tasks.length} 条记录 · 保留最近 100 条</span>
        <div style={{ flex: 1 }} />
        <Select
          value={filter}
          onChange={setFilter}
          style={{ width: 140 }}
          options={FILTERS}
          size="small"
        />
      </div>
      {shown.length === 0 ? (
        <div className="cp-card">
          <EmptyState title="暂无任务" hint="到「构建」页发起第一个构建" />
        </div>
      ) : (
        shown.map((t, i) => <TaskCard key={t.id} task={t} index={i} />)
      )}
    </div>
  );
}