import { Bot, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SidebarHeaderProps {
  onNewChat: () => void;
}

export function SidebarHeader({ onNewChat }: SidebarHeaderProps) {
  return (
    <header className="px-3 pb-3 pt-4">
      <div className="glass-panel rounded-[28px] px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-300/25 via-sky-300/18 to-emerald-300/20 text-cyan-100 ring-1 ring-white/10">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">
              AionChat
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold tracking-tight text-foreground">
              Story console
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Manage conversations, character sheets, and reusable lore from one
          workspace.
        </p>
      </div>
      <Button
        className="mt-3 w-full"
        onClick={onNewChat}
        aria-label="Create new conversation"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        New Chat
      </Button>
    </header>
  );
}
