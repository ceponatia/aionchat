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
    <div className="glass-panel mx-auto max-w-2xl rounded-[32px] px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/22 via-sky-300/16 to-emerald-300/18 text-cyan-100 ring-1 ring-white/10">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-display mt-4 text-xl font-semibold tracking-tight text-foreground">
        {copy.title}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
        {copy.body}
      </p>
    </div>
  );
}
