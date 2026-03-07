import {
  AlignJustify,
  PanelsTopLeft,
  ScrollText,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  activeId: string | null;
  activeTitle: string | null;
  onToggleSummary: () => void;
  onTogglePromptInspector: () => void;
  onToggleSettings: () => void;
  onClearActive: () => void;
  onOpenSidebar: () => void;
}

export function ChatHeader({
  activeId,
  activeTitle,
  onToggleSummary,
  onTogglePromptInspector,
  onToggleSettings,
  onClearActive,
  onOpenSidebar,
}: ChatHeaderProps) {
  return (
    <header className="safe-area-pt px-4 py-3 sm:px-6 lg:px-8 lg:py-5">
      <div className="glass-panel animate-surface-in mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-[28px] px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AionChat
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {activeId ? "Live session" : "Ready"}
            </span>
          </div>
          <h2 className="font-display truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {activeTitle ?? "Aion-2.0 Conversation"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Long-form roleplay chat with conversation memory, lore, and prompt
            controls.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeId ? (
            <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/4 p-1.5 backdrop-blur-md md:flex">
              <Button variant="ghost" size="sm" onClick={onToggleSummary}>
                <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
                Summary
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePromptInspector}
              >
                <PanelsTopLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Context
              </Button>
              <Button variant="ghost" size="sm" onClick={onToggleSettings}>
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearActive}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Clear Active
              </Button>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onOpenSidebar}
          >
            <AlignJustify className="h-3.5 w-3.5" aria-hidden="true" />
            Menu
          </Button>
        </div>
      </div>
    </header>
  );
}
