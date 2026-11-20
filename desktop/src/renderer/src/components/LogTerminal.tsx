import { useEffect, useRef, useState } from 'react';
import { Button } from '@arco-design/web-react';
import { Down } from '@icon-park/react';
import { useLogStream } from '@renderer/hooks/useLogStream';

export default function LogTerminal({
  taskId,
  height = 'calc(100vh - 250px)'
}: {
  taskId: string;
  height?: string;
}): React.ReactNode {
  const { lines } = useLogStream(taskId);
  const preRef = useRef<HTMLPreElement>(null);
  const followRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    const pre = preRef.current;
    if (pre && followRef.current) pre.scrollTop = pre.scrollHeight;
  }, [lines]);

  const onScroll = (): void => {
    const pre = preRef.current;
    if (!pre) return;
    const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 40;
    followRef.current = atBottom;
    setShowJump(!atBottom);
  };

  const jumpLatest = (): void => {
    const pre = preRef.current;
    if (pre) {
      pre.scrollTop = pre.scrollHeight;
      followRef.current = true;
      setShowJump(false);
    }
  };

  return (
    <div className="log-terminal" style={{ height }}>
      <div className="term-bar">
        <i /><i /><i />
        <span>构建日志 · 实时流 · {taskId}</span>
      </div>
      <pre ref={preRef} onScroll={onScroll}>
        {lines.join('\n')}
      </pre>
      {showJump && (
        <Button
          className="jump-latest"
          size="mini"
          type="primary"
          icon={<Down />}
          onClick={jumpLatest}
        >
          回到最新
        </Button>
      )}
    </div>
  );
}