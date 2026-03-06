import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  CharacterSheetDetail,
  CreateCharacterSheetBody,
} from "@/lib/types";

interface CharacterSheetFields {
  name: string;
  tagline: string | null;
  personality: string | null;
  background: string | null;
  appearance: string | null;
  scenario: string | null;
  customInstructions: string | null;
}

interface CharacterSheetEditorProps {
  sheet: CharacterSheetDetail | null;
  initialDraft: CreateCharacterSheetBody | null;
  onSave: (data: CharacterSheetFields) => Promise<void>;
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
        onChange={(e) => onChange(e.target.value)}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
      />
    </label>
  );
}

function orEmpty(value: string | null | undefined): string {
  return value ?? "";
}

function useCharacterSheetForm(
  sheet: CharacterSheetDetail | null,
  initialDraft: CreateCharacterSheetBody | null,
) {
  const [name, setName] = useState(orEmpty(sheet?.name ?? initialDraft?.name));
  const [tagline, setTagline] = useState(
    orEmpty(sheet?.tagline ?? initialDraft?.tagline),
  );
  const [personality, setPersonality] = useState(
    orEmpty(sheet?.personality ?? initialDraft?.personality),
  );
  const [background, setBackground] = useState(
    orEmpty(sheet?.background ?? initialDraft?.background),
  );
  const [appearance, setAppearance] = useState(
    orEmpty(sheet?.appearance ?? initialDraft?.appearance),
  );
  const [scenario, setScenario] = useState(
    orEmpty(sheet?.scenario ?? initialDraft?.scenario),
  );
  const [customInstructions, setCustomInstructions] = useState(
    orEmpty(sheet?.customInstructions ?? initialDraft?.customInstructions),
  );

  const trimOrNull = useCallback(
    (value: string): string | null => value.trim() || null,
    [],
  );

  const toFields = useCallback(
    (): CharacterSheetFields => ({
      name: name.trim(),
      tagline: trimOrNull(tagline),
      personality: trimOrNull(personality),
      background: trimOrNull(background),
      appearance: trimOrNull(appearance),
      scenario: trimOrNull(scenario),
      customInstructions: trimOrNull(customInstructions),
    }),
    [
      name,
      tagline,
      personality,
      background,
      appearance,
      scenario,
      customInstructions,
      trimOrNull,
    ],
  );

  return {
    name,
    setName,
    tagline,
    setTagline,
    personality,
    setPersonality,
    background,
    setBackground,
    appearance,
    setAppearance,
    scenario,
    setScenario,
    customInstructions,
    setCustomInstructions,
    toFields,
  };
}

function EditorForm({
  form,
}: {
  form: ReturnType<typeof useCharacterSheetForm>;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      <TextInput
        label="Name"
        value={form.name}
        onChange={form.setName}
        placeholder="Character name"
        required
      />
      <TextInput
        label="Tagline"
        value={form.tagline}
        onChange={form.setTagline}
        placeholder="One-line summary"
      />
      <TextArea
        label="Personality"
        value={form.personality}
        onChange={form.setPersonality}
      />
      <TextArea
        label="Background"
        value={form.background}
        onChange={form.setBackground}
      />
      <TextArea
        label="Appearance"
        value={form.appearance}
        onChange={form.setAppearance}
      />
      <TextArea
        label="Scenario"
        value={form.scenario}
        onChange={form.setScenario}
      />
      <TextArea
        label="Custom Instructions"
        value={form.customInstructions}
        onChange={form.setCustomInstructions}
      />
    </div>
  );
}

export function CharacterSheetEditor({
  sheet,
  initialDraft,
  onSave,
  onDelete,
  onExport,
  onCancel,
}: CharacterSheetEditorProps) {
  const form = useCharacterSheetForm(sheet, initialDraft);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
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
        "Delete this character sheet? Conversations using it will lose their character attachment.",
      )
    )
      return;
    await onDelete();
  }, [onDelete]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          {sheet ? "Edit Character" : "New Character"}
        </h2>
      </header>

      <EditorForm form={form} />

      <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button onClick={handleSave} disabled={!form.name.trim() || isSaving}>
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
