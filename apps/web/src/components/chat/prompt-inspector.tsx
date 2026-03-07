import { Button } from "@/components/ui/button";
import type {
  PromptAssemblyResult,
  PromptSegment,
  PromptSegmentKind,
  PromptSegmentReason,
} from "@/lib/types";

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
  const systemContextBudgetLimit = assembly
    ? Math.max(
        assembly.budget.targetChars -
          assembly.budget.reservedRecentMessageChars,
        0,
      )
    : 0;

  return (
    <div className="px-4 pb-2 sm:px-6 lg:px-8">
      <div className="glass-panel animate-surface-in mx-auto w-full max-w-5xl space-y-4 rounded-[30px] px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Prompt Inspector
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview for the next outbound turn using the current conversation
              state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing…" : "Refresh"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {isStale ? (
          <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            Draft input changed after this preview was generated. Refresh to
            inspect the current turn.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[22px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {!error && !assembly && !isLoading ? (
          <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-xs text-muted-foreground">
            No prompt preview is available yet.
          </div>
        ) : null}

        {assembly ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-xs text-muted-foreground xl:col-span-2">
                <p>
                  System message size:{" "}
                  <span className="text-foreground">
                    {assembly.systemMessage?.length ?? 0}
                  </span>{" "}
                  chars
                </p>
                <p>
                  Budget mode:{" "}
                  <span className="text-foreground">
                    {assembly.budget.mode}
                  </span>
                </p>
                <p>
                  System-context budget:{" "}
                  <span className="text-foreground">
                    {assembly.budget.usedSystemContextChars}
                  </span>{" "}
                  / {systemContextBudgetLimit} chars
                </p>
                <p>
                  Total prompt budget:{" "}
                  <span className="text-foreground">
                    {assembly.budget.usedTotalChars}
                  </span>{" "}
                  / {assembly.budget.targetChars} chars
                </p>
                <p>
                  Reserved recent-message budget:{" "}
                  <span className="text-foreground">
                    {assembly.budget.reservedRecentMessageChars}
                  </span>{" "}
                  chars
                </p>
                <p>
                  Segments:{" "}
                  <span className="text-foreground">
                    {assembly.segments.length}
                  </span>
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-xs text-muted-foreground">
                Inspect which context blocks are being kept, trimmed, or sent as
                recent chat history.
              </div>
            </div>

            {assembly.budget.overBudget ? (
              <div className="rounded-[22px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                Required context still exceeds budget after all allowed
                omissions.
              </div>
            ) : null}

            {assembly.budget.omittedSegmentIds.length > 0 ? (
              <div className="rounded-[22px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                Omitted segments: {assembly.budget.omittedSegmentIds.join(", ")}
              </div>
            ) : null}

            <div className="space-y-3">
              {assembly.segments.map((segment) => (
                <section
                  key={segment.id}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-display text-base font-medium text-foreground">
                        {segment.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatKind(segment.kind)} •{" "}
                        {formatReason(segment.reason)} •{" "}
                        {segment.estimatedChars} chars
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
                          Sent as chat-role messages, not injected into system
                          message
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap wrap-break-word rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-foreground">
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
