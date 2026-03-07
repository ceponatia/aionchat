import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import type { CharacterSheetListItem } from "@/lib/types";

interface CharacterSheetListProps {
  characterSheets: CharacterSheetListItem[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onNewFromTemplate: () => void;
  onImport: (file: File) => void;
}

export function CharacterSheetList({
  characterSheets,
  isLoading,
  onSelect,
  onNew,
  onNewFromTemplate,
  onImport,
}: CharacterSheetListProps) {
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
          Characters
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
            New Character
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

      {isLoading && characterSheets.length === 0 ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-md bg-panel-elevated" />
          <div className="h-10 animate-pulse rounded-md bg-panel-elevated" />
        </div>
      ) : null}

      {!isLoading && characterSheets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-3 text-xs text-muted-foreground">
          No characters yet. Create one to get started.
        </div>
      ) : null}

      <ul className="space-y-1">
        {characterSheets.map((sheet) => (
          <li key={sheet.id}>
            <button
              type="button"
              className="w-full rounded-2xl border border-transparent px-3 py-3 text-left transition-colors hover:border-white/10 hover:bg-white/5"
              onClick={() => onSelect(sheet.id)}
            >
              <p className="truncate text-sm font-medium text-foreground">
                {sheet.name}
              </p>
              {sheet.tagline ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {sheet.tagline}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
