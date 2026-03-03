import { useMemo, useState } from "react";

import type { ConversationListItem } from "@/lib/types";

interface ConversationListProps {
  conversations: ConversationListItem[];
  activeId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
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
  activeId,
  isLoading,
  onSelect,
  onRename,
  onDelete,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversations],
  );

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

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      {isLoading && conversations.length === 0 ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
          <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
          <div className="h-12 animate-pulse rounded-md bg-panel-elevated" />
        </div>
      ) : null}

      {!isLoading && sortedConversations.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          No conversations yet. Start chatting to create one.
        </div>
      ) : null}

      <ul className="space-y-2">
        {sortedConversations.map((conversation) => (
          <li key={conversation.id}>
            <div
              className={
                conversation.id === activeId
                  ? "rounded-md border border-sky-400/40 bg-panel-elevated px-3 py-2"
                  : "rounded-md border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-panel-elevated"
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
                      className="w-full rounded border border-input bg-input px-2 py-1 text-sm text-foreground outline-none"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(conversation.updatedAt)} •{" "}
                      {conversation.messageCount} msg
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(conversation.id)}
                    onDoubleClick={() => {
                      setEditingId(conversation.id);
                      setEditingTitle(conversation.title);
                    }}
                  >
                    <p className="truncate text-sm text-slate-100">
                      {conversation.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(conversation.updatedAt)} •{" "}
                      {conversation.messageCount} msg
                    </p>
                  </button>
                )}
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-input hover:text-foreground"
                    onClick={() => {
                      setEditingId(conversation.id);
                      setEditingTitle(conversation.title);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/40"
                    onClick={() => {
                      void confirmDelete(conversation.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
