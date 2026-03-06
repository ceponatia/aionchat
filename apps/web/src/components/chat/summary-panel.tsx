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
    <div className="border-b border-border bg-panel px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Conversation Summary
            </h3>
            <p className="text-xs text-muted-foreground">
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
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {!error && !state && !isLoading ? (
          <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            No summary state is available yet.
          </div>
        ) : null}

        {state ? (
          <>
            <div className="rounded-md border border-border bg-panel-elevated px-3 py-3 text-xs text-muted-foreground">
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

            <div className="rounded-md border border-border bg-panel-elevated px-3 py-3 text-xs text-muted-foreground">
              {formatStatusDescription(state)}
            </div>

            {state.invalidatedAt ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Invalidated at {new Date(state.invalidatedAt).toLocaleString()}.
              </div>
            ) : null}

            {state.summary ? (
              <section className="rounded-md border border-border bg-panel-elevated px-3 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Current summary
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Covers {state.summary.coveredMessageCount} messages •
                    Updated {new Date(state.summary.updatedAt).toLocaleString()}
                  </p>
                </div>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap wrap-break-word rounded-md border border-border/70 bg-panel px-3 py-2 text-xs text-foreground">
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
