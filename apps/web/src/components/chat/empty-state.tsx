import { MessageCircle, Sparkles } from "lucide-react";

interface EmptyStateProps {
  variant: "no-conversations" | "new-conversation";
}

const emptyStateCopy: Record<
  EmptyStateProps["variant"],
  { title: string; body: string }
> = {
  "no-conversations": {
    title: "Welcome to AionChat",
    body: "Start a conversation with Aion-2.0. Type a message below to begin.",
  },
  "new-conversation": {
    title: "New conversation",
    body: "What would you like to talk about?",
  },
};

export function EmptyState({ variant }: EmptyStateProps) {
  const icon = variant === "no-conversations" ? MessageCircle : Sparkles;
  const Icon = icon;
  const copy = emptyStateCopy[variant];

  return (
    <div className="rounded-xl border border-dashed border-border bg-panel-elevated/70 px-6 py-10 text-center">
      <Icon className="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        {copy.title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
    </div>
  );
}
