import { Button } from "@/components/ui/button";
import type { PromptAssemblyResult, PromptSegment, PromptSegmentKind, PromptSegmentReason } from "@/lib/types";

interface PromptInspectorProps {
  assembly: PromptAssemblyResult | null;
  currentDraft: string;
  previewDraft: string;
  error: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

function formatKind(kind: PromptSegmentKind): string {
  switch (kind) {
    case "system-prompt":
      return "System prompt";
    case "character-sheet":
      return "Character sheet";
    case "pinned-lore":
      return "Pinned lore";
    case "matched-lore":
      return "Matched lore";
    case "summary-memory":
      return "Summary memory";
    case "recent-messages":
      return "Recent messages";
  }
}

function formatReason(reason: PromptSegmentReason): string {
  switch (reason) {
    case "configured":
      return "Configured";
    case "attached":
      return "Attached";
    case "matched-by-tag":
      return "Matched by tag";
    case "matched-by-hint":
      return "Matched by activation hint";
    case "generated-summary":
      return "Generated summary";
    case "recent-history":
      return "Recent history";
    case "disabled":
      return "Disabled by conversation setting";
  }
}

function segmentBadgeLabel(segment: PromptSegment): string {
  if (segment.kind === "recent-messages") return "Chat history";
  return segment.included ? "Included" : "Omitted";
}

function segmentTone(segment: PromptSegment): string {
  if (segment.kind === "recent-messages") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  return segment.included
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

export function PromptInspector({
  assembly,
  currentDraft,
  previewDraft,
  error,
  isLoading,
  onRefresh,
  onClose,
}: PromptInspectorProps) {
  const isStale = currentDraft !== previewDraft;

  return (
    <div className="border-b border-border bg-panel px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Prompt Inspector</h3>
            <p className="text-xs text-muted-foreground">
              Preview for the next outbound turn using the current conversation state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
              {isLoading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {isStale ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Draft input changed after this preview was generated. Refresh to inspect the current turn.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {!error && !assembly && !isLoading ? (
          <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            No prompt preview is available yet.
          </div>
        ) : null}

        {assembly ? (
          <>
            <div className="rounded-md border border-border bg-panel-elevated px-3 py-3 text-xs text-muted-foreground">
              <p>
                System message size: <span className="text-foreground">{assembly.systemMessage?.length ?? 0}</span> chars
              </p>
              <p>
                Segments: <span className="text-foreground">{assembly.segments.length}</span>
              </p>
            </div>

            <div className="space-y-3">
              {assembly.segments.map((segment) => (
                <section
                  key={segment.id}
                  className="rounded-md border border-border bg-panel-elevated px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{segment.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatKind(segment.kind)} • {formatReason(segment.reason)} • {segment.estimatedChars} chars
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full border px-2 py-1 text-[11px] font-medium ${segmentTone(segment)}`}
                      >
                        {segmentBadgeLabel(segment)}
                      </span>
                      {segment.kind === "recent-messages" ? (
                        <span className="text-[10px] text-muted-foreground">
                          Sent as chat-role messages, not injected into system message
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap wrap-break-word rounded-md border border-border/70 bg-panel px-3 py-2 text-xs text-foreground">
                    {segment.content}
                  </pre>
                </section>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}