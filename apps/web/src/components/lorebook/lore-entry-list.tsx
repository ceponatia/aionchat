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
    <section className="glass-panel mb-3 rounded-[28px] px-3 py-3">
      <div className="mb-3 px-2">
        <h3 className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Lorebook
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handlePickImportFile}
          >
            Import
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onNewFromTemplate}
          >
            Template
          </Button>
          <Button size="sm" className="col-span-2 w-full" onClick={onNew}>
            New Entry
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
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-3 text-xs text-muted-foreground">
          No lore entries yet. Create one to attach reusable world context.
        </div>
      ) : null}

      <ul className="space-y-1">
        {loreEntries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="w-full rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-white/10 hover:bg-white/5"
              onClick={() => onSelect(entry.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {entry.title}
                </p>
                <span className="shrink-0 rounded-full border border-white/8 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatTypeLabel(entry.type)}
                </span>
              </div>
              {entry.tags.length > 0 ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {entry.tags.join(", ")}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
