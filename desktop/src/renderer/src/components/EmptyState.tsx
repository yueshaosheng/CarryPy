export default function EmptyState({
  title,
  hint
}: {
  title: string;
  hint: string;
}): React.ReactNode {
  return (
    <div className="empty-state">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ opacity: 0.85 }}>
        <rect x="8" y="17" width="40" height="28" rx="4" stroke="var(--color-border-3)" strokeWidth="2" />
        <path d="M15 24v14M22 24v14M29 24v14M36 24v14M43 24v14" stroke="var(--color-fill-3)" strokeWidth="2" />
        <path d="M19 17l4-7h10l4 7" stroke="rgb(var(--primary-6))" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p>{title}</p>
      <p className="hint">{hint}</p>
    </div>
  );
}