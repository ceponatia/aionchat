import { useState } from "react";

import { ConversationListItemComponent } from "@/components/sidebar/conversation-list-item";
import { ConversationSkeleton } from "@/components/sidebar/conversation-skeleton";
import type { ConversationListItem, TagItem } from "@/lib/types";

interface ConversationListProps {
  conversations: ConversationListItem[];
  allTags: TagItem[];
  activeId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetTags: (id: string, tagIds: string[]) => Promise<void>;
  onSetArchived: (id: string, archived: boolean) => Promise<void>;
  onReloadConversations: () => Promise<void>;
}

interface UseConversationListControllerArgs {
  conversations: ConversationListItem[];
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetTags: (id: string, tagIds: string[]) => Promise<void>;
}

interface ConversationListHeaderProps {
  count: number;
}

function ConversationListHeader({ count }: ConversationListHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between px-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Sessions
        </p>
        <h2 className="font-display mt-1 text-base font-semibold text-foreground">
          Conversations
        </h2>
      </div>
      <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

interface ConversationListStateProps {
  isLoading: boolean;
  isEmpty: boolean;
}

function ConversationListState({
  isLoading,
  isEmpty,
}: ConversationListStateProps) {
  if (isLoading && isEmpty) {
    return <ConversationSkeleton />;
  }

  if (!isLoading && isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-4 text-xs text-muted-foreground">
        No matching conversations. Adjust the filters or start a new thread.
      </div>
    );
  }

  return null;
}

function useConversationListController({
  conversations,
  onRename,
  onDelete,
  onSetTags,
}: UseConversationListControllerArgs) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [tagEditorId, setTagEditorId] = useState<string | null>(null);

  async function submitRename(conversationId: string): Promise<void> {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      setEditingTitle("");
      return;
    }

    await onRename(conversationId, title);
    setEditingId(null);
    setEditingTitle("");
  }

  async function confirmDelete(conversationId: string): Promise<void> {
    if (
      !window.confirm(
        "Delete conversation? This permanently removes all messages.",
      )
    ) {
      return;
    }

    await onDelete(conversationId);
  }

  function startRename(conversationId: string, title: string): void {
    setEditingId(conversationId);
    setEditingTitle(title);
  }

  function cancelRename(): void {
    setEditingId(null);
    setEditingTitle("");
  }

  function toggleTagEditor(conversationId: string): void {
    setTagEditorId((current) =>
      current === conversationId ? null : conversationId,
    );
  }

  function toggleConversationTag(
    conversationId: string,
    tagId: string,
    isSelected: boolean,
  ): void {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    const nextTagIds = isSelected
      ? conversation.tags
          .filter((item) => item.id !== tagId)
          .map((item) => item.id)
      : [...conversation.tags.map((item) => item.id), tagId];

    void onSetTags(conversationId, nextTagIds);
  }

  function focusConversationByOffset(currentId: string, offset: number): void {
    const currentIndex = conversations.findIndex((item) => item.id === currentId);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = Math.max(
      0,
      Math.min(conversations.length - 1, currentIndex + offset),
    );
    const nextId = conversations[nextIndex]?.id;
    if (!nextId) {
      return;
    }

    const nextButton = document.querySelector<HTMLButtonElement>(
      `button[data-conversation-id="${nextId}"]`,
    );
    nextButton?.focus();
  }

  return {
    editingId,
    editingTitle,
    tagEditorId,
    setEditingTitle,
    submitRename,
    confirmDelete,
    startRename,
    cancelRename,
    toggleTagEditor,
    toggleConversationTag,
    focusConversationByOffset,
  };
}

export function ConversationList({
  conversations,
  allTags,
  activeId,
  isLoading,
  onSelect,
  onRename,
  onDelete,
  onSetTags,
  onSetArchived,
}: ConversationListProps) {
  const isEmpty = conversations.length === 0;
  const {
    editingId,
    editingTitle,
    tagEditorId,
    setEditingTitle,
    submitRename,
    confirmDelete,
    startRename,
    cancelRename,
    toggleTagEditor,
    toggleConversationTag,
    focusConversationByOffset,
  } = useConversationListController({
    conversations,
    onRename,
    onDelete,
    onSetTags,
  });

  return (
    <section className="glass-panel mb-3 rounded-[28px] px-3 py-3">
      <ConversationListHeader count={conversations.length} />
      <ConversationListState isLoading={isLoading} isEmpty={isEmpty} />

      <ul className="space-y-2" aria-label="Conversations" role="listbox">
        {conversations.map((conversation) => (
          <ConversationListItemComponent
            key={conversation.id}
            conversation={conversation}
            allTags={allTags}
            isActive={conversation.id === activeId}
            isEditing={editingId === conversation.id}
            isTagEditorOpen={tagEditorId === conversation.id}
            editingTitle={editingTitle}
            onEditingTitleChange={setEditingTitle}
            onSelect={onSelect}
            onStartRename={startRename}
            onSubmitRename={submitRename}
            onCancelRename={cancelRename}
            onFocusOffset={focusConversationByOffset}
            onToggleTagEditor={toggleTagEditor}
            onSetArchived={onSetArchived}
            onDelete={confirmDelete}
            onToggleTag={toggleConversationTag}
          />
        ))}
      </ul>
    </section>
  );
}
