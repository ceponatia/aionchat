import { useCallback, useState, type ReactNode } from "react";
import {
  BookOpenText,
  CircleHelp,
  Compass,
  ScrollText,
  Tags,
} from "lucide-react";

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

interface HelpContent {
  title: string;
  description: string;
  examples?: string[];
}

function HelpPopover({ content }: { content: HelpContent }) {
  return (
    <span className="group relative z-0 inline-flex align-middle group-hover:z-50 group-focus-within:z-50">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-cyan-300/30 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        aria-label={`More information about ${content.title}`}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="pointer-events-none absolute left-0 top-full z-40 mt-2 w-80 max-w-[min(20rem,calc(100vw-2rem))] translate-y-1 rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-left opacity-0 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.95)] transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/85">
          {content.title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-slate-200">
          {content.description}
        </span>
        {content.examples?.length ? (
          <span className="mt-3 block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Examples
            </span>
            <span className="mt-2 flex flex-col gap-2 text-sm leading-6 text-slate-300">
              {content.examples.map((example) => (
                <span
                  key={example}
                  className="rounded-xl border border-white/8 bg-white/5 px-3 py-2"
                >
                  {example}
                </span>
              ))}
            </span>
          </span>
        ) : null}
      </span>
    </span>
  );
}

function LabelText({
  label,
  required,
  helper,
}: {
  label: string;
  required?: boolean;
  helper?: HelpContent;
}) {
  return (
    <span className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {helper ? <HelpPopover content={helper} /> : null}
    </span>
  );
}

const HELP = {
  classification: {
    title: "Classification",
    description:
      "Use this section to define what the lore is, how it should be grouped, and whether it belongs broadly or only in a narrow context.",
    examples: [
      "A law entry tagged 'law, harbor, customs' for port inspections.",
      "A faction entry tagged 'vael, nobility, succession' for House Vael.",
    ],
  },
  title: {
    title: "Title",
    description:
      "Choose a clear, specific name that looks like a retrievable fact, place, group, rule, or document rather than a vague topic.",
    examples: ["Riverwatch Toll Charter", "House Vael Succession Compact"],
  },
  type: {
    title: "Type",
    description:
      "Pick the narrowest type that fits the lore. This keeps the lorebook easier to sort and scan later.",
    examples: [
      "Use 'world' for a setting rule or cultural practice.",
      "Use 'faction' for a guild, house, order, or political group.",
    ],
  },
  tags: {
    title: "Tags",
    description:
      "Tags should mirror the short words or concepts likely to appear during play. Favor concise searchable terms over sentence fragments.",
    examples: ["river, tolls, checkpoint", "inheritance, nobles, claimants"],
  },
  global: {
    title: "Global Entry",
    description:
      "Enable this when the lore should stay available across conversations. Leave it off when the entry only matters to one scenario or temporary branch.",
    examples: [
      "Global: a kingdom-wide dueling law.",
      "Not global: a rumor that only matters in one active plotline.",
    ],
  },
  activation: {
    title: "Activation",
    description:
      "Activation hints are soft triggers. Describe the kinds of phrases, scenes, or topics that should cause this lore to surface.",
    examples: [
      "checkpoint searches, toll disputes, customs officers",
      "when the cast asks about inheritance rules or noble claims",
    ],
  },
  activationHints: {
    title: "Activation Hints",
    description:
      "Write comma-separated retrieval cues, not a second summary. Think about how the topic is likely to show up in actual chat.",
    examples: [
      "river crossing permits, smuggler routes",
      "succession hearing, claimant challenge, bloodline dispute",
    ],
  },
  body: {
    title: "Body",
    description:
      "Store the reusable facts here. Keep it concrete, stable, and worth inserting more than once. Prefer durable truths over scene-specific narration.",
    examples: [
      "In Dovren, duel challenges must be witnessed by a clerk of seals to be binding.",
      "The Frost Ledger is a tax record harbor inspectors use to validate winter grain shipments.",
    ],
  },
} satisfies Record<string, HelpContent>;

function LoreEntryTopBar({
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
              Lore editor
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
  helper,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  helper?: HelpContent;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel relative z-0 rounded-[28px] px-5 py-5 transition-[z-index] hover:z-20 focus-within:z-20">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-300/18 via-sky-300/14 to-emerald-300/16 text-cyan-100 ring-1 ring-white/10">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {helper ? <HelpPopover content={helper} /> : null}
          </div>
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
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  helper?: HelpContent;
}) {
  return (
    <label className="block">
      <LabelText label={label} required={required} helper={helper} />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
  rows = 4,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  helper?: HelpContent;
}) {
  return (
    <label className="block">
      <LabelText label={label} helper={helper} />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm leading-7 text-foreground placeholder:text-muted-foreground shadow-inner shadow-black/15 outline-none transition focus:border-cyan-300/40 focus:bg-slate-950/45"
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

function EditorForm({ form }: { form: ReturnType<typeof useLoreEntryForm> }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="glass-panel rounded-4xl px-6 py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">
                Lore entry
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Define reusable lore
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Organize the entry so it is easy to match, easy to scan, and
                strong enough to support repeated story turns without bloating
                the prompt.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:self-stretch">
              <div className="balanced-tile flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Classification
                </p>
                <p className="balanced-tile-title mt-2 text-sm font-medium leading-6 text-foreground">
                  Type, tags, and scope
                </p>
              </div>
              <div className="balanced-tile flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Activation
                </p>
                <p className="balanced-tile-title mt-2 text-sm font-medium leading-6 text-foreground">
                  Hints for when it matters
                </p>
              </div>
              <div className="balanced-tile flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2 xl:col-span-1">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Content
                </p>
                <p className="balanced-tile-title mt-2 text-sm font-medium leading-6 text-foreground">
                  Reusable lore body
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionCard
          title="Classification"
          description="Define the entry identity first so retrieval and filtering stay predictable."
          icon={<Tags className="h-4 w-4" aria-hidden="true" />}
          helper={HELP.classification}
        >
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.8fr]">
            <TextInput
              label="Title"
              value={form.title}
              onChange={form.setTitle}
              placeholder="Ancient treaty of the river kingdoms"
              required
              helper={HELP.title}
            />

            <label className="block">
              <LabelText label="Type" helper={HELP.type} />
              <select
                value={form.type}
                onChange={(event) =>
                  setTypeValue(event.target.value, form.setType)
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/15 outline-none transition focus:border-cyan-300/40 focus:bg-slate-950/45"
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
              helper={HELP.tags}
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.isGlobal}
                onChange={(event) => form.setIsGlobal(event.target.checked)}
                className="h-4 w-4 rounded border-white/15 bg-slate-950/45"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">Global entry</p>
                  <HelpPopover content={HELP.global} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Keep this available across conversations instead of treating
                  it as a one-off note.
                </p>
              </div>
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Activation"
          description="Give the system lightweight cues for when this lore should surface during a scene."
          icon={<Compass className="h-4 w-4" aria-hidden="true" />}
          helper={HELP.activation}
        >
          <div className="grid gap-4">
            <TextInput
              label="Activation Hints"
              value={form.activationHints}
              onChange={form.setActivationHints}
              placeholder="mentions of river crossings, customs officers"
              helper={HELP.activationHints}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Lore Body"
          description="Store the reusable text itself here. Write it as something worth retrieving repeatedly."
          icon={<ScrollText className="h-4 w-4" aria-hidden="true" />}
          helper={HELP.body}
        >
          <div className="grid gap-4">
            <TextArea
              label="Body"
              value={form.body}
              onChange={form.setBody}
              rows={14}
              placeholder="Store the reusable lore text here"
              helper={HELP.body}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Quality Bar"
          description="A strong lore entry is compact, specific, and retrieval-friendly instead of reading like an unstructured wiki dump."
          icon={<BookOpenText className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Specific
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Prefer concrete facts, customs, names, or constraints over vague
                summary prose.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Matchable
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Use tags and hints that correspond to how the topic is likely to
                appear in chat.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Reusable
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Keep the body stable enough to be inserted across multiple turns
                or conversations.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
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
      <LoreEntryTopBar
        title={entry ? "Edit Lore Entry" : "New Lore Entry"}
        isSaving={isSaving}
        canSave={Boolean(form.title.trim() && form.body.trim())}
        onSave={handleSave}
        onCancel={onCancel}
        onExport={onExport}
        onDelete={onDelete ? handleDelete : null}
      />

      <EditorForm form={form} />
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
