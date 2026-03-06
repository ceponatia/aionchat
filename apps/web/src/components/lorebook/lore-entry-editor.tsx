import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  LORE_ENTRY_TYPES,
  type CreateLoreEntryBody,
  type LoreEntryDetail,
  type LoreEntryType,
} from "@/lib/types";

interface LoreEntryFields {
  title: string;
  type: LoreEntryType;
  tags: string[];
  body: string;
  activationHints: string[];
  isGlobal: boolean;
}

interface LoreEntryEditorProps {
  entry: LoreEntryDetail | null;
  initialDraft: CreateLoreEntryBody | null;
  onSave: (data: LoreEntryFields) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
  onExport: (() => void) | null;
  onCancel: () => void;
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
      />
    </label>
  );
}

function joinList(values: string[] | null | undefined): string {
  return values?.join(", ") ?? "";
}

function parseList(value: string): string[] {
  const unique = new Set<string>();

  for (const item of value.split(",")) {
    const trimmed = item.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return [...unique];
}

function useLoreEntryForm(
  entry: LoreEntryDetail | null,
  initialDraft: CreateLoreEntryBody | null,
) {
  const [title, setTitle] = useState(entry?.title ?? initialDraft?.title ?? "");
  const [type, setType] = useState<LoreEntryType>(
    entry?.type ?? initialDraft?.type ?? "world",
  );
  const [tags, setTags] = useState(joinList(entry?.tags ?? initialDraft?.tags));
  const [body, setBody] = useState(entry?.body ?? initialDraft?.body ?? "");
  const [activationHints, setActivationHints] = useState(
    joinList(entry?.activationHints ?? initialDraft?.activationHints),
  );
  const [isGlobal, setIsGlobal] = useState(
    entry?.isGlobal ?? initialDraft?.isGlobal ?? true,
  );

  const toFields = useCallback(
    (): LoreEntryFields => ({
      title: title.trim(),
      type,
      tags: parseList(tags),
      body: body.trim(),
      activationHints: parseList(activationHints),
      isGlobal,
    }),
    [activationHints, body, isGlobal, tags, title, type],
  );

  return {
    title,
    setTitle,
    type,
    setType,
    tags,
    setTags,
    body,
    setBody,
    activationHints,
    setActivationHints,
    isGlobal,
    setIsGlobal,
    toFields,
  };
}

// eslint-disable-next-line max-lines-per-function -- editor keeps the full plain-text lore authoring form in one component
export function LoreEntryEditor({
  entry,
  initialDraft,
  onSave,
  onDelete,
  onExport,
  onCancel,
}: LoreEntryEditorProps) {
  const form = useLoreEntryForm(entry, initialDraft);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setIsSaving(true);
    try {
      await onSave(form.toFields());
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    if (
      !window.confirm(
        "Delete this lore entry? Attached conversations will lose the lore reference.",
      )
    ) {
      return;
    }
    await onDelete();
  }, [onDelete]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          {entry ? "Edit Lore Entry" : "New Lore Entry"}
        </h2>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <TextInput
          label="Title"
          value={form.title}
          onChange={form.setTitle}
          placeholder="Ancient treaty of the river kingdoms"
          required
        />

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Type
          </span>
          <select
            value={form.type}
            onChange={(event) => setTypeValue(event.target.value, form.setType)}
            className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground focus:border-sky-400 focus:outline-none"
          >
            {LORE_ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <TextInput
          label="Tags"
          value={form.tags}
          onChange={form.setTags}
          placeholder="kingdom, river, treaty"
        />

        <TextInput
          label="Activation Hints"
          value={form.activationHints}
          onChange={form.setActivationHints}
          placeholder="mentions of river crossings, customs officers"
        />

        <TextArea
          label="Body"
          value={form.body}
          onChange={form.setBody}
          rows={14}
          placeholder="Store the reusable lore text here"
        />

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.isGlobal}
            onChange={(event) => form.setIsGlobal(event.target.checked)}
            className="h-4 w-4 rounded border-input bg-input"
          />
          Global entry
        </label>
      </div>

      <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button
          onClick={handleSave}
          disabled={!form.title.trim() || !form.body.trim() || isSaving}
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
        {onExport ? (
          <Button variant="ghost" onClick={onExport}>
            Export
          </Button>
        ) : null}
        {onDelete ? (
          <Button variant="ghost" onClick={handleDelete}>
            Delete
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </footer>
    </div>
  );
}

function setTypeValue(
  value: string,
  setType: (value: LoreEntryType) => void,
): void {
  if ((LORE_ENTRY_TYPES as readonly string[]).includes(value)) {
    setType(value as LoreEntryType);
  }
}
