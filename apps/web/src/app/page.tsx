"use client";

import { ChatShell } from "@/components/chat/chat-shell";
import { ChatWorkspace } from "@/components/sections/chat-workspace";
import { EditorRouter } from "@/components/sections/editor-router";
import { SidebarContainer } from "@/components/sections/sidebar-container";
import { useEditorKeyboardShortcuts } from "@/lib/hooks/use-editor-keyboard-shortcuts";
import { AppPreferencesProvider } from "@/lib/providers/app-preferences-provider";
import {
  ConversationProvider,
  useConversation,
} from "@/lib/providers/conversation-provider";
import { EditorProvider, useEditor } from "@/lib/providers/editor-provider";

function HomePageContent() {
  const { handleNewChat } = useConversation();
  const { isSidebarOpen, closeSidebar } = useEditor();

  useEditorKeyboardShortcuts({
    onNewChat: () => {
      void handleNewChat();
    },
    onEscapeCloseSidebar: closeSidebar,
  });

  return (
    <EditorRouter>
      <ChatShell
        sidebar={<SidebarContainer />}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={closeSidebar}
      >
        <ChatWorkspace />
      </ChatShell>
    </EditorRouter>
  );
}

export default function HomePage() {
  return (
    <AppPreferencesProvider>
      <ConversationProvider>
        <EditorProvider>
          <HomePageContent />
        </EditorProvider>
      </ConversationProvider>
    </AppPreferencesProvider>
  );
}
