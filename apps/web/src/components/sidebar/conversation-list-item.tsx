import { TagAssignmentPanel } from "@/components/sidebar/tag-assignment-panel";
import type { ConversationListItem, TagItem } from "@/lib/types";

interface ConversationListItemComponentProps {
  conversation: ConversationListItem;
  allTags: TagItem[];
  isActive: boolean;
  isEditing: boolean;
  isTagEditorOpen: boolean;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onSelect: (id: string) => void;
  onStartRename: (id: string, title: string) => void;
  onSubmitRename: (id: string) => Promise<void>;
  onCancelRename: () => void;
  onFocusOffset: (id: string, offset: number) => void;
  onToggleTagEditor: (id: string) => void;
  onSetArchived: (id: string, archived: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleTag: (conversationId: string, tagId: string, isSelected: boolean) => void;
}

interface ConversationMetadataProps {
  conversation: ConversationListItem;
}

interface RenameEditorProps {
  conversation: ConversationListItem;
  editingTitle: string;
  onEditingTitleChange: (title: string) => void;
  onSubmitRename: (id: string) => Promise<void>;
  onCancelRename: () => void;
}

interface ReadOnlyConversationBodyProps {
  conversation: ConversationListItem;
  onSelect: (id: string) => void;
  onStartRename: (id: string, title: string) => void;
  onFocusOffset: (id: string, offset: number) => void;
}

interface ConversationActionButtonsProps {
  conversation: ConversationListItem;
  onToggleTagEditor: (id: string) => void;
  onSetArchived: (id: string, archived: boolean) => Promise<void>;
  onStartRename: (id: string, title: string) => void;
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

function ConversationMetadata({ conversation }: ConversationMetadataProps) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {formatRelativeTime(conversation.updatedAt)} • {conversation.messageCount} msg
      {conversation.archivedAt ? " • Archived" : ""}
    </p>
  );
}

function RenameEditor({
  conversation,
  editingTitle,
  onEditingTitleChange,
  onSubmitRename,
  onCancelRename,
}: RenameEditorProps) {
  return (
    <div className="min-w-0 flex-1">
      <input
        autoFocus
        value={editingTitle}
        onChange={(event) => onEditingTitleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void onSubmitRename(conversation.id);
          }
          if (event.key === "Escape") {
            onCancelRename();
          }
        }}
        onBlur={() => {
          void onSubmitRename(conversation.id);
        }}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-300/40"
      />
      <ConversationMetadata conversation={conversation} />
    </div>
  );
}

function ReadOnlyConversationBody({
  conversation,
  onSelect,
  onStartRename,
  onFocusOffset,
}: ReadOnlyConversationBodyProps) {
  return (
    <button
      type="button"
      className="min-w-0 flex-1 text-left"
      data-conversation-id={conversation.id}
      onClick={() => onSelect(conversation.id)}
      onDoubleClick={() => {
        onStartRename(conversation.id, conversation.title);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onFocusOffset(conversation.id, 1);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onFocusOffset(conversation.id, -1);
        }
      }}
      aria-label={`Open conversation ${conversation.title}`}
    >
      <p className="truncate text-sm font-medium text-slate-100">{conversation.title}</p>
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
      <ConversationMetadata conversation={conversation} />
    </button>
  );
}

function ConversationActionButtons({
  conversation,
  onToggleTagEditor,
  onSetArchived,
  onStartRename,
  onDelete,
}: ConversationActionButtonsProps) {
  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
        onClick={() => {
          onToggleTagEditor(conversation.id);
        }}
      >
        Tags
      </button>
      <button
        type="button"
        className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
        onClick={() => {
          void onSetArchived(conversation.id, conversation.archivedAt === null);
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
          onStartRename(conversation.id, conversation.title);
        }}
        aria-label={`Rename conversation ${conversation.title}`}
      >
        Rename
      </button>
      <button
        type="button"
        className="rounded-full border border-rose-400/15 px-2.5 py-1 text-xs text-rose-200 transition hover:bg-rose-400/10"
        onClick={() => {
          void onDelete(conversation.id);
        }}
        aria-label={`Delete conversation ${conversation.title}`}
      >
        Delete
      </button>
    </div>
  );
}

export function ConversationListItemComponent({
  conversation,
  allTags,
  isActive,
  isEditing,
  isTagEditorOpen,
  editingTitle,
  onEditingTitleChange,
  onSelect,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onFocusOffset,
  onToggleTagEditor,
  onSetArchived,
  onDelete,
  onToggleTag,
}: ConversationListItemComponentProps) {
  return (
    <li role="option" aria-selected={isActive}>
      <div
        className={
          isActive
            ? "soft-ring rounded-2xl border border-cyan-300/20 bg-linear-to-br from-cyan-300/12 to-transparent px-3 py-3"
            : "rounded-2xl border border-transparent bg-white/0 px-3 py-3 transition-colors hover:border-white/10 hover:bg-white/5"
        }
      >
        <div className="flex items-start gap-2">
          {isEditing ? (
            <RenameEditor
              conversation={conversation}
              editingTitle={editingTitle}
              onEditingTitleChange={onEditingTitleChange}
              onSubmitRename={onSubmitRename}
              onCancelRename={onCancelRename}
            />
          ) : (
            <ReadOnlyConversationBody
              conversation={conversation}
              onSelect={onSelect}
              onStartRename={onStartRename}
              onFocusOffset={onFocusOffset}
            />
          )}
          <ConversationActionButtons
            conversation={conversation}
            onToggleTagEditor={onToggleTagEditor}
            onSetArchived={onSetArchived}
            onStartRename={onStartRename}
            onDelete={onDelete}
          />
        </div>

        {isTagEditorOpen ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 p-3">
            <TagAssignmentPanel
              allTags={allTags}
              conversationTags={conversation.tags}
              onToggleTag={(tagId, isSelected) => {
                onToggleTag(conversation.id, tagId, isSelected);
              }}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}