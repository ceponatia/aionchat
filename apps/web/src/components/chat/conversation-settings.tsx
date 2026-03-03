import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CharacterSheetListItem } from "@/lib/types";

interface ConversationSettingsProps {
  systemPrompt: string | null;
  characterSheetId: string | null;
  characterSheets: CharacterSheetListItem[];
  onSave: (settings: {
    systemPrompt: string | null;
    characterSheetId: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export function ConversationSettings({
  systemPrompt,
  characterSheetId,
  characterSheets,
  onSave,
  onClose,
}: ConversationSettingsProps) {
  const [prompt, setPrompt] = useState(systemPrompt ?? "");
  const [selectedSheetId, setSelectedSheetId] = useState(
    characterSheetId ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave({
        systemPrompt: prompt.trim() || null,
        characterSheetId: selectedSheetId || null,
      });
    } finally {
      setIsSaving(false);
    }
  }, [prompt, selectedSheetId, onSave]);

  return (
    <div className="border-b border-border bg-panel px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Conversation Settings
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            System Prompt
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Instructions for the model (e.g., 'You are a helpful roleplay partner...')"
            className="w-full resize-y rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-sky-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Character
          </span>
          <select
            value={selectedSheetId}
            onChange={(e) => setSelectedSheetId(e.target.value)}
            className="w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground focus:border-sky-400 focus:outline-none"
          >
            <option value="">None</option>
            {characterSheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name}
              </option>
            ))}
          </select>
        </label>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
