import { ConversationList } from "@/components/sidebar/conversation-list";
import { SidebarHeader } from "@/components/sidebar/sidebar-header";

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader onNewChat={onNewChat} />
      <ConversationList />
    </div>
  );
}
