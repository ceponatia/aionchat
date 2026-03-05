export function ConversationSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
      <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
      <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
      <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
    </div>
  );
}
