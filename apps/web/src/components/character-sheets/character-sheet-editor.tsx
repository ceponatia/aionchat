import { useCallback, useState } from "react";
import { ScrollText, Sparkles, UserRound } from "lucide-react";

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

function CharacterSheetTopBar({
  title,
  isSaving,
  canSave,
  onSave,
  onCancel,
  onExport,
  onDelete,
}: {
  title: string;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  onExport: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/72 backdrop-blur-xl">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              Character editor
            </p>
            <h1 className="font-display mt-1 text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button onClick={onSave} disabled={!canSave || isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            {onExport ? (
              <Button variant="ghost" onClick={onExport}>
                Export
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="ghost" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-[28px] px-5 py-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-300/18 via-sky-300/14 to-emerald-300/16 text-cyan-100 ring-1 ring-white/10">
          {icon}
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
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
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground shadow-inner shadow-black/15 outline-none transition focus:border-cyan-300/40 focus:bg-slate-950/45"
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
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm leading-7 text-foreground placeholder:text-muted-foreground shadow-inner shadow-black/15 outline-none transition focus:border-cyan-300/40 focus:bg-slate-950/45"
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
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="glass-panel rounded-4xl px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">
                Character sheet
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Shape a character with clear presence
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Keep the essentials concise, then use the larger sections to
                define how the character thinks, moves, and fits into the
                current story.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:self-stretch">
              <div className="balanced-tile flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Identity
                </p>
                <p className="balanced-tile-title mt-2 text-sm font-medium leading-6 text-foreground">
                  Name and hook
                </p>
              </div>
              <div className="balanced-tile flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Voice
                </p>
                <p className="balanced-tile-title mt-2 text-sm font-medium leading-6 text-foreground">
                  Personality and tone
                </p>
              </div>
              <div className="balanced-tile flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2 xl:col-span-1">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Framing
                </p>
                <p className="balanced-tile-title mt-2 text-sm font-medium leading-6 text-foreground">
                  Scenario and rules
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionCard
          title="Identity"
          description="Start with the compact information someone should understand at a glance."
          icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
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
          </div>
        </SectionCard>

        <SectionCard
          title="Core Profile"
          description="Use these sections to define inner logic and visual identity without making the page feel too sprawling."
          icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <TextArea
              label="Personality"
              value={form.personality}
              onChange={form.setPersonality}
            />
            <TextArea
              label="Appearance"
              value={form.appearance}
              onChange={form.setAppearance}
            />
            <div className="xl:col-span-2">
              <TextArea
                label="Background"
                value={form.background}
                onChange={form.setBackground}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Story Framing"
          description="Capture how this character enters scenes and any instructions that should shape model behavior."
          icon={<ScrollText className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-4">
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
        </SectionCard>
      </div>
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
      <CharacterSheetTopBar
        title={sheet ? "Edit Character" : "New Character"}
        isSaving={isSaving}
        canSave={Boolean(form.name.trim())}
        onSave={handleSave}
        onCancel={onCancel}
        onExport={onExport}
        onDelete={onDelete ? handleDelete : null}
      />

      <EditorForm form={form} />
    </div>
  );
}
