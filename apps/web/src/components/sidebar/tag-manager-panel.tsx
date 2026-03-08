import { useState } from "react";

import { DEFAULT_TAG_COLOR, TagColorPicker } from "@/components/sidebar/tag-color-picker";
import type { CreateTagBody, TagItem, UpdateTagBody } from "@/lib/types";

interface TagManagerPanelProps {
  tags: TagItem[];
  onCreateTag: (body: CreateTagBody) => Promise<void>;
  onUpdateTag: (id: string, body: UpdateTagBody) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
}

interface CreateTagSectionProps {
  newTagName: string;
  newTagColor: string;
  onNewTagNameChange: (value: string) => void;
  onNewTagColorChange: (value: string) => void;
  onCreateTag: (body: CreateTagBody) => Promise<void>;
  onCreated: () => void;
}

function CreateTagSection({
  newTagName,
  newTagColor,
  onNewTagNameChange,
  onNewTagColorChange,
  onCreateTag,
  onCreated,
}: CreateTagSectionProps) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        Create tag
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <input
          value={newTagName}
          onChange={(event) => onNewTagNameChange(event.target.value)}
          placeholder="Campaign, Archived, Investigations"
          className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-cyan-300/40"
        />
        <TagColorPicker value={newTagColor} onChange={onNewTagColorChange} />
        <button
          type="button"
          className="rounded-full border border-cyan-200/20 bg-linear-to-r from-cyan-200 via-sky-300 to-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950"
          onClick={() => {
            const name = newTagName.trim();
            if (!name) {
              return;
            }
            void onCreateTag({ name, color: newTagColor }).then(onCreated);
          }}
        >
          Create tag
        </button>
      </div>
    </div>
  );
}

interface TagManagerItemProps {
  tag: TagItem;
  isEditing: boolean;
  editingTagName: string;
  editingTagColor: string;
  onEditingTagNameChange: (value: string) => void;
  onEditingTagColorChange: (value: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onDelete: () => void;
}

function TagManagerItem({
  tag,
  isEditing,
  editingTagName,
  editingTagColor,
  onEditingTagNameChange,
  onEditingTagColorChange,
  onStartEditing,
  onCancelEditing,
  onSave,
  onDelete,
}: TagManagerItemProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-3">
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={editingTagName}
            onChange={(event) => onEditingTagNameChange(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-300/40"
          />
          <TagColorPicker
            value={editingTagColor}
            onChange={onEditingTagColorChange}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-full border border-cyan-200/20 bg-linear-to-r from-cyan-200 via-sky-300 to-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-950"
              onClick={onSave}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              onClick={onCancelEditing}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span
              className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{
                borderColor: tag.color,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
              onClick={onStartEditing}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded-full border border-rose-400/20 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-400/10"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TagManagerPanel({
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerPanelProps) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagColor, setEditingTagColor] = useState(DEFAULT_TAG_COLOR);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-3">
      <div className="space-y-3">
        <CreateTagSection
          newTagName={newTagName}
          newTagColor={newTagColor}
          onNewTagNameChange={setNewTagName}
          onNewTagColorChange={setNewTagColor}
          onCreateTag={onCreateTag}
          onCreated={() => {
            setNewTagName("");
            setNewTagColor(DEFAULT_TAG_COLOR);
          }}
        />

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Existing tags
          </p>
          {tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tags yet.</p>
          ) : null}
          {tags.map((tag) => {
            return (
              <TagManagerItem
                key={tag.id}
                tag={tag}
                isEditing={editingTagId === tag.id}
                editingTagName={editingTagName}
                editingTagColor={editingTagColor}
                onEditingTagNameChange={setEditingTagName}
                onEditingTagColorChange={setEditingTagColor}
                onStartEditing={() => {
                  setEditingTagId(tag.id);
                  setEditingTagName(tag.name);
                  setEditingTagColor(tag.color);
                }}
                onCancelEditing={() => setEditingTagId(null)}
                onSave={() => {
                  const name = editingTagName.trim();
                  if (!name) {
                    return;
                  }
                  void onUpdateTag(tag.id, {
                    name,
                    color: editingTagColor,
                  }).then(() => {
                    setEditingTagId(null);
                  });
                }}
                onDelete={() => {
                  void onDeleteTag(tag.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}