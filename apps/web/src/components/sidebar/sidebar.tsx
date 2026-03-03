import { ConversationList } from "@/components/sidebar/conversation-list";
import { SidebarHeader } from "@/components/sidebar/sidebar-header";
import type { ConversationListItem } from "@/lib/types";

interface SidebarProps {
  onNewChat: () => void;
  conversations: ConversationListItem[];
  activeId: string | null;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
}

export function Sidebar({
  onNewChat,
  conversations,
  activeId,
  isLoading,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader onNewChat={onNewChat} />
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        isLoading={isLoading}
        onSelect={onSelectConversation}
        onRename={onRenameConversation}
        onDelete={onDeleteConversation}
      />
    </div>
  );
}
