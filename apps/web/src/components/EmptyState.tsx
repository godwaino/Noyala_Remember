export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      role="status"
      className="border-border bg-surface rounded-lg border border-dashed p-8 text-center"
    >
      <p className="text-ink font-medium">{title}</p>
      <p className="text-ink-muted mt-1 text-sm">{description}</p>
    </div>
  );
}
