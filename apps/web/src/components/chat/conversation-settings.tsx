import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getKnownModels,
  getModelMetadata,
  isKnownModelId,
  normalizeModelId,
} from "@/lib/model-registry";
import type {
  CharacterSheetListItem,
  ConversationLoreEntryItem,
  LoreEntryListItem,
  PromptBudgetMode,
  PromptBudgetReport,
} from "@/lib/types";

interface SelectedLoreEntryState {
  loreEntryId: string;
  pinned: boolean;
}

interface SavedPromptPreset {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
}

const SAVED_PROMPT_PRESETS_KEY = "aionchat:saved-system-prompt-presets";

function parseSavedPromptPresets(value: string | null): SavedPromptPreset[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is SavedPromptPreset => {
        if (item === null || typeof item !== "object") {
          return false;
        }

        const candidate = item as Partial<SavedPromptPreset>;
        return (
          typeof candidate.id === "string" &&
          typeof candidate.name === "string" &&
          typeof candidate.content === "string" &&
          typeof candidate.updatedAt === "string"
        );
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

function persistSavedPromptPresets(presets: SavedPromptPreset[]): void {
  localStorage.setItem(SAVED_PROMPT_PRESETS_KEY, JSON.stringify(presets));
}

function defaultPromptPresetName(content: string): string {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return "System prompt";
  }

  return firstLine.slice(0, 48);
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [useCustom, setUseCustom] = useState(() => {
    return !isKnownModelId(selectedModel);
  });

  const effectiveModel = normalizeModelId(selectedModel);
  const metadata = getModelMetadata(effectiveModel);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "custom") {
      setUseCustom(true);
      onModelChange("");
    } else {
      setUseCustom(false);
      onModelChange(value);
    }
  };

  const costTierColor = {
    free: "text-green-400",
    low: "text-sky-400",
    medium: "text-amber-400",
    high: "text-rose-400",
  }[metadata.costTier];

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Model
        </span>
        {useCustom ? (
          <div className="space-y-2">
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder="Enter OpenRouter model ID (e.g., openai/gpt-4)"
              className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setUseCustom(false);
                onModelChange(normalizeModelId(null));
              }}
              className="text-xs text-sky-400 hover:underline"
            >
              Use known model
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <select
              value={effectiveModel}
              onChange={handleSelectChange}
              className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground focus:border-sky-400 focus:outline-none"
            >
              {getKnownModels().map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
              <option value="custom">Custom model...</option>
            </select>
          </div>
        )}
      </label>

      <div className="rounded-md border border-border bg-panel-elevated px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Context window:</span>
          <span className="text-foreground">
            {metadata.contextWindow.toLocaleString()} tokens
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Reasoning support:</span>
          <span
            className={
              metadata.supportsReasoning
                ? "text-green-400"
                : "text-muted-foreground"
            }
          >
            {metadata.supportsReasoning ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Cost tier:</span>
          <span className={costTierColor}>
            {metadata.costTier.charAt(0).toUpperCase() +
              metadata.costTier.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ConversationSettingsProps {
  systemPrompt: string | null;
  model: string | null;
  autoLoreEnabled: boolean;
  promptBudgetMode: PromptBudgetMode;
  budgetReport: PromptBudgetReport | null;
  characterSheetId: string | null;
  characterSheets: CharacterSheetListItem[];
  loreEntries: LoreEntryListItem[];
  attachedLoreEntries: ConversationLoreEntryItem[];
  onSave: (settings: {
    systemPrompt: string | null;
    model: string | null;
    autoLoreEnabled: boolean;
    promptBudgetMode: PromptBudgetMode;
    characterSheetId: string | null;
    loreEntries: Array<{
      loreEntryId: string;
      pinned: boolean;
      priority: number;
    }>;
  }) => Promise<void>;
  onClose: () => void;
}

// eslint-disable-next-line max-lines-per-function -- settings panel combines scalar settings and lore attachment editing in one surface
export function ConversationSettings({
  systemPrompt,
  model,
  autoLoreEnabled,
  promptBudgetMode,
  budgetReport,
  characterSheetId,
  characterSheets,
  loreEntries,
  attachedLoreEntries,
  onSave,
  onClose,
}: ConversationSettingsProps) {
  const [prompt, setPrompt] = useState(systemPrompt ?? "");
  const [selectedModel, setSelectedModel] = useState(model ?? "");
  const [isAutoLoreEnabled, setIsAutoLoreEnabled] = useState(autoLoreEnabled);
  const [selectedPromptBudgetMode, setSelectedPromptBudgetMode] =
    useState<PromptBudgetMode>(promptBudgetMode);
  const [selectedSheetId, setSelectedSheetId] = useState(
    characterSheetId ?? "",
  );
  const [selectedLoreEntries, setSelectedLoreEntries] = useState<
    SelectedLoreEntryState[]
  >(() =>
    [...attachedLoreEntries]
      .sort((a, b) => a.priority - b.priority)
      .map((item) => ({
        loreEntryId: item.loreEntryId,
        pinned: item.pinned,
      })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedPromptPresets, setSavedPromptPresets] = useState<
    SavedPromptPreset[]
  >([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");

  useEffect(() => {
    const presets = parseSavedPromptPresets(
      localStorage.getItem(SAVED_PROMPT_PRESETS_KEY),
    );
    setSavedPromptPresets(presets);
    setSelectedPresetId((current) => {
      if (current && presets.some((preset) => preset.id === current)) {
        return current;
      }

      return presets[0]?.id ?? "";
    });
  }, []);

  const selectedLoreEntryIds = new Set(
    selectedLoreEntries.map((item) => item.loreEntryId),
  );

  const attachedLoreEntryDetails = selectedLoreEntries
    .map((item) => ({
      ...item,
      loreEntry: loreEntries.find((entry) => entry.id === item.loreEntryId),
    }))
    .filter((item) => item.loreEntry);

  const selectedPreset = savedPromptPresets.find(
    (preset) => preset.id === selectedPresetId,
  );

  const handleToggleLoreEntry = useCallback((loreEntryId: string) => {
    setSelectedLoreEntries((current) => {
      const existing = current.find((item) => item.loreEntryId === loreEntryId);
      if (existing) {
        return current.filter((item) => item.loreEntryId !== loreEntryId);
      }

      return [...current, { loreEntryId, pinned: false }];
    });
  }, []);

  const handleTogglePinned = useCallback((loreEntryId: string) => {
    setSelectedLoreEntries((current) =>
      current.map((item) =>
        item.loreEntryId === loreEntryId
          ? { ...item, pinned: !item.pinned }
          : item,
      ),
    );
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({
        systemPrompt: prompt.trim() || null,
        model: selectedModel.trim() || null,
        autoLoreEnabled: isAutoLoreEnabled,
        promptBudgetMode: selectedPromptBudgetMode,
        characterSheetId: selectedSheetId || null,
        loreEntries: selectedLoreEntries.map((item, index) => ({
          loreEntryId: item.loreEntryId,
          pinned: item.pinned,
          priority: index,
        })),
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    isAutoLoreEnabled,
    onSave,
    prompt,
    selectedModel,
    selectedLoreEntries,
    selectedPromptBudgetMode,
    selectedSheetId,
  ]);

  const handleSavePromptPreset = useCallback(() => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error("System prompt is empty", {
        description: "Add prompt text before saving a reusable preset.",
      });
      return;
    }

    const suggestedName = defaultPromptPresetName(trimmedPrompt);
    const providedName = window.prompt(
      "Name this saved system prompt",
      suggestedName,
    );

    if (!providedName) {
      return;
    }

    const name = providedName.trim();
    if (!name) {
      toast.error("Prompt name is required");
      return;
    }

    const now = new Date().toISOString();
    const existingPreset = savedPromptPresets.find(
      (preset) => preset.name.toLowerCase() === name.toLowerCase(),
    );
    const nextPreset: SavedPromptPreset = existingPreset
      ? {
          ...existingPreset,
          name,
          content: trimmedPrompt,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          name,
          content: trimmedPrompt,
          updatedAt: now,
        };

    const nextPresets = [
      nextPreset,
      ...savedPromptPresets.filter((preset) => preset.id !== nextPreset.id),
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    persistSavedPromptPresets(nextPresets);
    setSavedPromptPresets(nextPresets);
    setSelectedPresetId(nextPreset.id);
    toast.success("Saved system prompt preset", {
      description: `Stored as ${name}.`,
    });
  }, [prompt, savedPromptPresets]);

  const handleLoadPromptPreset = useCallback(() => {
    if (!selectedPreset) {
      return;
    }

    setPrompt(selectedPreset.content);
    toast.success("Loaded system prompt preset", {
      description: `Applied ${selectedPreset.name} to this conversation.`,
    });
  }, [selectedPreset]);

  const handleDeletePromptPreset = useCallback(() => {
    if (!selectedPreset) {
      return;
    }

    const confirmed = window.confirm(
      `Delete saved prompt \"${selectedPreset.name}\"?`,
    );
    if (!confirmed) {
      return;
    }

    const nextPresets = savedPromptPresets.filter(
      (preset) => preset.id !== selectedPreset.id,
    );
    persistSavedPromptPresets(nextPresets);
    setSavedPromptPresets(nextPresets);
    setSelectedPresetId(nextPresets[0]?.id ?? "");
    toast.success("Deleted saved prompt preset");
  }, [savedPromptPresets, selectedPreset]);

  const isTrimmed = (budgetReport?.omittedSegmentIds.length ?? 0) > 0;
  const systemContextBudgetLimit = budgetReport
    ? Math.max(
        budgetReport.targetChars - budgetReport.reservedRecentMessageChars,
        0,
      )
    : 0;

  return (
    <div className="min-h-0 px-4 pb-2 sm:px-6 lg:px-8">
      <div className="glass-panel animate-surface-in mx-auto flex max-h-[calc(100dvh-10.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-5 sm:px-6">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Conversation Settings
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tune prompt behavior, model choice, and attached context for this
              thread.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-5 [-webkit-overflow-scrolling:touch] sm:px-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              System Prompt
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Instructions for the model (e.g., 'You are a helpful roleplay partner...')"
              className="w-full resize-y rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
            />
          </label>

          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Saved Prompts
                </span>
                {savedPromptPresets.length > 0 ? (
                  <select
                    value={selectedPresetId}
                    onChange={(event) =>
                      setSelectedPresetId(event.target.value)
                    }
                    className="w-full rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground focus:border-sky-400 focus:outline-none"
                  >
                    {savedPromptPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 px-4 py-3 text-xs text-muted-foreground">
                    No saved prompts yet. Save the current system prompt as a
                    reusable preset.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleSavePromptPreset}
                  className="w-full sm:w-auto"
                >
                  Save Prompt
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleLoadPromptPreset}
                  disabled={!selectedPreset}
                  className="w-full sm:w-auto"
                >
                  Load Prompt
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleDeletePromptPreset}
                  disabled={!selectedPreset}
                  className="w-full sm:w-auto"
                >
                  Delete Prompt
                </Button>
              </div>
            </div>
          </div>

          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Character
            </span>
            <select
              value={selectedSheetId}
              onChange={(e) => setSelectedSheetId(e.target.value)}
              className="w-full rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground focus:border-sky-400 focus:outline-none"
            >
              <option value="">None</option>
              {characterSheets.map((sheet) => (
                <option key={sheet.id} value={sheet.id}>
                  {sheet.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isAutoLoreEnabled}
              onChange={(event) => setIsAutoLoreEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input bg-input"
            />
            <div>
              <p className="font-medium">Auto-match attached lore</p>
              <p className="text-xs text-muted-foreground">
                Include non-pinned attached lore when tags or activation hints
                match the next turn.
              </p>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Prompt Budget Mode
            </span>
            <select
              value={selectedPromptBudgetMode}
              onChange={(event) =>
                setSelectedPromptBudgetMode(
                  event.target.value as PromptBudgetMode,
                )
              }
              className="w-full rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground focus:border-sky-400 focus:outline-none"
            >
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
              <option value="high-budget">High Budget</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Balanced keeps more context blocks. Aggressive trims optional
              context earlier to preserve recent turn flow. High Budget keeps a
              larger system prompt and character sheet before optional context
              gets trimmed.
            </p>
          </label>

          {budgetReport ? (
            <div
              className={`rounded-3xl border px-4 py-4 text-xs ${
                budgetReport.overBudget
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                  : isTrimmed
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                    : "border-white/10 bg-white/5 text-muted-foreground"
              }`}
            >
              <p>
                System-context budget:{" "}
                <span className="text-foreground">
                  {budgetReport.usedSystemContextChars}
                </span>{" "}
                / {systemContextBudgetLimit} chars
              </p>
              <p>
                Total prompt budget:{" "}
                <span className="text-foreground">
                  {budgetReport.usedTotalChars}
                </span>{" "}
                / {budgetReport.targetChars} chars
              </p>
              <p>
                Reserved for recent messages:{" "}
                <span className="text-foreground">
                  {budgetReport.reservedRecentMessageChars}
                </span>{" "}
                chars
              </p>
              {budgetReport.overBudget ? (
                <p className="mt-1">
                  Required context is still over budget. Reduce system prompt or
                  character sheet size.
                </p>
              ) : null}
              {!budgetReport.overBudget && isTrimmed ? (
                <p className="mt-1">
                  Optional context was trimmed for this turn. Open Prompt
                  Inspector for omitted segment details.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Attached Lore
              </span>
              {attachedLoreEntryDetails.length > 0 ? (
                <div className="space-y-2 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                  {attachedLoreEntryDetails.map((item, index) => (
                    <div
                      key={item.loreEntryId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          {index + 1}. {item.loreEntry?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.loreEntry?.type}
                        </p>
                      </div>
                      <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={item.pinned}
                          onChange={() => handleTogglePinned(item.loreEntryId)}
                          className="h-4 w-4 rounded border-input bg-input"
                        />
                        Pinned
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 px-4 py-4 text-xs text-muted-foreground">
                  No lore attached to this conversation.
                </div>
              )}
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Available Lore Entries
              </span>
              {loreEntries.length > 0 ? (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                  {loreEntries.map((entry) => (
                    <label
                      key={entry.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 px-3 py-3 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLoreEntryIds.has(entry.id)}
                        onChange={() => handleToggleLoreEntry(entry.id)}
                        className="mt-0.5 h-4 w-4 rounded border-input bg-input"
                      />
                      <div className="min-w-0">
                        <p className="truncate">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.type}
                          {entry.tags.length > 0
                            ? ` • ${entry.tags.join(", ")}`
                            : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/12 bg-white/4 px-4 py-4 text-xs text-muted-foreground">
                  No lore entries available yet. Create one from the sidebar
                  first.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-slate-950/25 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
