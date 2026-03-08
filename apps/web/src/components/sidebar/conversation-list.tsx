import { useState } from "react";

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

function formatRelativeTime(isoTime: string): string {
  const ms = Date.now() - new Date(isoTime).getTime();
  const minutes = Math.max(1, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoTime).toLocaleDateString();
}

// eslint-disable-next-line max-lines-per-function -- interactive list with inline rename/delete state
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

  function focusConversationByOffset(currentId: string, offset: number): void {
    const currentIndex = conversations.findIndex(
      (c) => c.id === currentId,
    );
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

  return (
    <section className="glass-panel mb-3 rounded-[28px] px-3 py-3">
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
          {conversations.length}
        </span>
      </div>

      {isLoading && conversations.length === 0 ? (
        <ConversationSkeleton />
      ) : null}

      {!isLoading && conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-4 text-xs text-muted-foreground">
          No matching conversations. Adjust the filters or start a new thread.
        </div>
      ) : null}

      <ul className="space-y-2" aria-label="Conversations" role="listbox">
        {conversations.map((conversation) => (
          <li
            key={conversation.id}
            role="option"
            aria-selected={conversation.id === activeId}
          >
            <div
              className={
                conversation.id === activeId
                  ? "soft-ring rounded-2xl border border-cyan-300/20 bg-linear-to-br from-cyan-300/12 to-transparent px-3 py-3"
                  : "rounded-2xl border border-transparent bg-white/0 px-3 py-3 transition-colors hover:border-white/10 hover:bg-white/5"
              }
            >
              <div className="flex items-start gap-2">
                {editingId === conversation.id ? (
                  <div className="min-w-0 flex-1">
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void submitRename(conversation.id);
                        }
                        if (event.key === "Escape") {
                          setEditingId(null);
                          setEditingTitle("");
                        }
                      }}
                      onBlur={() => {
                        void submitRename(conversation.id);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-300/40"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(conversation.updatedAt)} •{" "}
                      {conversation.messageCount} msg
                      {conversation.archivedAt ? " • Archived" : ""}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    data-conversation-id={conversation.id}
                    onClick={() => onSelect(conversation.id)}
                    onDoubleClick={() => {
                      setEditingId(conversation.id);
                      setEditingTitle(conversation.title);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        focusConversationByOffset(conversation.id, 1);
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        focusConversationByOffset(conversation.id, -1);
                      }
                    }}
                    aria-label={`Open conversation ${conversation.title}`}
                  >
                    <p className="truncate text-sm font-medium text-slate-100">
                      {conversation.title}
                    </p>
                    {conversation.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {conversation.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full border px-2 py-0.5 text-[11px]"
                            style={{
                              borderColor: tag.color,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(conversation.updatedAt)} •{" "}
                      {conversation.messageCount} msg
                      {conversation.archivedAt ? " • Archived" : ""}
                    </p>
                  </button>
                )}
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                    onClick={() => {
                      setTagEditorId((current) =>
                        current === conversation.id ? null : conversation.id,
                      );
                    }}
                  >
                    Tags
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                    onClick={() => {
                      void onSetArchived(
                        conversation.id,
                        conversation.archivedAt === null,
                      );
                    }}
                    aria-label={
                      conversation.archivedAt
                        ? `Unarchive conversation ${conversation.title}`
                        : `Archive conversation ${conversation.title}`
                    }
                  >
                    {conversation.archivedAt ? "Restore" : "Archive"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                    onClick={() => {
                      setEditingId(conversation.id);
                      setEditingTitle(conversation.title);
                    }}
                    aria-label={`Rename conversation ${conversation.title}`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-400/15 px-2.5 py-1 text-xs text-rose-200 transition hover:bg-rose-400/10"
                    onClick={() => {
                      void confirmDelete(conversation.id);
                    }}
                    aria-label={`Delete conversation ${conversation.title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {tagEditorId === conversation.id ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  {allTags.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Create tags above, then assign them here.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const isSelected = conversation.tags.some(
                          (item) => item.id === tag.id,
                        );
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            className="rounded-full border px-3 py-1.5 text-xs"
                            style={
                              isSelected
                                ? {
                                    borderColor: tag.color,
                                    backgroundColor: `${tag.color}22`,
                                    color: tag.color,
                                  }
                                : {
                                    borderColor: "rgba(255,255,255,0.1)",
                                    color: tag.color,
                                  }
                            }
                            onClick={() => {
                              const nextTagIds = isSelected
                                ? conversation.tags
                                    .filter((item) => item.id !== tag.id)
                                    .map((item) => item.id)
                                : [
                                    ...conversation.tags.map((item) => item.id),
                                    tag.id,
                                  ];
                              void onSetTags(conversation.id, nextTagIds);
                            }}
                          >
                            {isSelected ? "Remove" : "Add"} {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
