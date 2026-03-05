import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  activeId: string | null;
  activeTitle: string | null;
  onToggleSettings: () => void;
  onClearActive: () => void;
  onOpenSidebar: () => void;
}

export function ChatHeader({
  activeId,
  activeTitle,
  onToggleSettings,
  onClearActive,
  onOpenSidebar,
}: ChatHeaderProps) {
  return (
    <header className="safe-area-pt border-b border-border bg-panel px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            AionChat
          </p>
          <h2 className="text-sm font-medium text-foreground sm:text-base">
            {activeTitle ?? "Aion-2.0 Conversation"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {activeId ? (
            <>
              <Button variant="ghost" size="sm" onClick={onToggleSettings}>
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearActive}>
                Clear Active
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onOpenSidebar}
          >
            Menu
          </Button>
        </div>
      </div>
    </header>
  );
}
