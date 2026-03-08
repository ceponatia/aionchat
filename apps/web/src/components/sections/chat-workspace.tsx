"use client";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageList } from "@/components/chat/message-list";
import { ConversationPanels } from "@/components/sections/conversation-panels";
import { useConversation } from "@/lib/providers/conversation-provider";
import { useEditor } from "@/lib/providers/editor-provider";

// eslint-disable-next-line max-lines-per-function -- section intentionally composes header, panels, budget banner, message list, and input in page order
export function ChatWorkspace() {
  const {
    activeId,
    activeTitle,
    conversations,
    promptPreview,
    messages,
    isLoading,
    isLoadingMessages,
    hasMore,
    isLoadingMore,
    isMessageOperationPending,
    pendingAssistantPlacement,
    loadMore,
    handleEditMessage,
    handleDeleteMessage,
    handleRegenerateMessage,
    handleBranchMessage,
    handleResendMessage,
    error,
    input,
    setInput,
    handleSend,
    handleClearActive,
  } = useConversation();
  const {
    activePanel,
    toggleSummary,
    togglePromptInspector,
    toggleSettings,
    closePanels,
    openSidebar,
  } = useEditor();

  const showSettings = activePanel === "settings";

  return (
    <>
      <ChatHeader
        activeId={activeId}
        activeTitle={activeTitle}
        onToggleSummary={toggleSummary}
        onTogglePromptInspector={togglePromptInspector}
        onToggleSettings={toggleSettings}
        onClearActive={() => {
          closePanels();
          handleClearActive();
        }}
        onOpenSidebar={openSidebar}
      />

      <ConversationPanels />

      {!showSettings ? (
        <>
          {activeId && promptPreview ? (
            promptPreview.budget.overBudget ? (
              <div className="glass-panel animate-surface-in mx-auto mt-3 w-full max-w-5xl rounded-3xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100 sm:px-6">
                Context is still over budget after deterministic trimming.
                Reduce the system prompt or character sheet content to avoid
                request pressure.
              </div>
            ) : promptPreview.budget.omittedSegmentIds.length > 0 ? (
              <div className="glass-panel animate-surface-in mx-auto mt-3 w-full max-w-5xl rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 sm:px-6">
                Context was trimmed for this turn.{" "}
                {promptPreview.budget.omittedSegmentIds.length} optional
                segment(s) were omitted.
              </div>
            ) : null
          ) : null}

          <MessageList
            messages={messages}
            isLoading={isLoading || isLoadingMessages}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            isActionsDisabled={
              isLoading || isLoadingMessages || isMessageOperationPending
            }
            pendingAssistantPlacement={pendingAssistantPlacement}
            onLoadMore={loadMore}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onBranchMessage={handleBranchMessage}
            onResendMessage={handleResendMessage}
            hasAnyConversations={conversations.length > 0}
          />

          {error ? (
            <div className="mx-auto w-full max-w-5xl px-4 pb-3 text-xs text-rose-300 sm:px-6">
              {error}
            </div>
          ) : null}

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => {
              void handleSend();
            }}
            isLoading={isLoading}
          />
        </>
      ) : null}
    </>
  );
}
