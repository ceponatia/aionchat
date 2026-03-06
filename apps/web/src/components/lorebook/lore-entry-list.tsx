import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import type { LoreEntryListItem } from "@/lib/types";

interface LoreEntryListProps {
  loreEntries: LoreEntryListItem[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onNewFromTemplate: () => void;
  onImport: (file: File) => void;
}

function formatTypeLabel(type: LoreEntryListItem["type"]): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function LoreEntryList({
  loreEntries,
  isLoading,
  onSelect,
  onNew,
  onNewFromTemplate,
  onImport,
}: LoreEntryListProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handlePickImportFile(): void {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    event.target.value = "";
  }

  return (
    <div className="border-t border-border px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Lorebook
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handlePickImportFile}>
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewFromTemplate}>
            Template
          </Button>
          <Button variant="ghost" size="sm" onClick={onNew}>
            + New
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {isLoading && loreEntries.length === 0 ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-md bg-panel-elevated" />
          <div className="h-10 animate-pulse rounded-md bg-panel-elevated" />
        </div>
      ) : null}

      {!isLoading && loreEntries.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          No lore entries yet. Create one to attach reusable world context.
        </div>
      ) : null}

      <ul className="space-y-1">
        {loreEntries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-panel-elevated"
              onClick={() => onSelect(entry.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-foreground">
                  {entry.title}
                </p>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatTypeLabel(entry.type)}
                </span>
              </div>
              {entry.tags.length > 0 ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {entry.tags.join(", ")}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
