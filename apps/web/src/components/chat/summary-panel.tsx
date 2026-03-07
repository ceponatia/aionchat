import { Button } from "@/components/ui/button";
import type { ConversationSummaryState } from "@/lib/types";

interface SummaryPanelProps {
  state: ConversationSummaryState | null;
  error: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

function formatStatusLabel(status: ConversationSummaryState["status"]): string {
  switch (status) {
    case "available":
      return "Available";
    case "not-ready":
      return "Not ready";
    case "eligible":
      return "Ready to generate";
    case "invalidated":
      return "Invalidated";
    case "failed":
      return "Generation failed";
  }
}

function formatFallbackMode(state: ConversationSummaryState): string {
  switch (state.fallbackMode) {
    case "summary":
      return "Current requests use summary memory plus post-cutoff verbatim turns.";
    case "recent-only":
      return `Current requests fall back to the most recent ${state.recentMessageWindow} messages.`;
    case "full-history":
      return "Current requests still use full verbatim history because the conversation is short.";
  }
}

function formatStatusDescription(state: ConversationSummaryState): string {
  switch (state.status) {
    case "available":
      return "A rolling summary is stored and active for prompt assembly.";
    case "not-ready":
      return `A summary becomes eligible once the conversation has at least ${state.minimumSummaryMessages} messages.`;
    case "eligible":
      return "This conversation is long enough to generate a rolling summary, but none has been stored yet.";
    case "invalidated":
      return "The previous summary was cleared after a history mutation. Generate a new one to restore durable memory.";
    case "failed":
      return (
        state.failureMessage ?? "The latest summary refresh attempt failed."
      );
  }
}

export function SummaryPanel({
  state,
  error,
  isLoading,
  onRefresh,
  onClose,
}: SummaryPanelProps) {
  return (
    <div className="px-4 pb-2 sm:px-6 lg:px-8">
      <div className="glass-panel animate-surface-in mx-auto w-full max-w-5xl space-y-4 rounded-[30px] px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Conversation Summary
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Rolling memory keeps older turns compressed while recent turns
              stay verbatim.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing…" : "Regenerate"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-[22px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {!error && !state && !isLoading ? (
          <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-xs text-muted-foreground">
            No summary state is available yet.
          </div>
        ) : null}

        {state ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-xs text-muted-foreground">
                <p>
                  Status:{" "}
                  <span className="text-foreground">
                    {formatStatusLabel(state.status)}
                  </span>
                </p>
                <p>
                  Messages:{" "}
                  <span className="text-foreground">{state.messageCount}</span>
                </p>
                <p>{formatFallbackMode(state)}</p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-xs text-muted-foreground md:col-span-2">
                {formatStatusDescription(state)}
              </div>
            </div>

            {state.invalidatedAt ? (
              <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                Invalidated at {new Date(state.invalidatedAt).toLocaleString()}.
              </div>
            ) : null}

            {state.summary ? (
              <section className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="space-y-1">
                  <p className="font-display text-base font-medium text-foreground">
                    Current summary
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Covers {state.summary.coveredMessageCount} messages •
                    Updated {new Date(state.summary.updatedAt).toLocaleString()}
                  </p>
                </div>
                <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-foreground">
                  {state.summary.summary}
                </pre>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
