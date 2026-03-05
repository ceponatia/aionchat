import { Button } from "@/components/ui/button";

interface SidebarHeaderProps {
  onNewChat: () => void;
}

export function SidebarHeader({ onNewChat }: SidebarHeaderProps) {
  return (
    <header className="border-b border-border px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        AionChat
      </p>
      <h1 className="mt-1 text-lg font-semibold text-foreground">
        Conversations
      </h1>
      <Button
        className="mt-4 w-full"
        onClick={onNewChat}
        aria-label="Create new conversation"
      >
        New Chat
      </Button>
    </header>
  );
}
