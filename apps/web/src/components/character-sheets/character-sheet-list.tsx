import { Button } from "@/components/ui/button";
import type { CharacterSheetListItem } from "@/lib/types";

interface CharacterSheetListProps {
  characterSheets: CharacterSheetListItem[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function CharacterSheetList({
  characterSheets,
  isLoading,
  onSelect,
  onNew,
}: CharacterSheetListProps) {
  return (
    <div className="border-t border-border px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Characters
        </h3>
        <Button variant="ghost" size="sm" onClick={onNew}>
          + New
        </Button>
      </div>

      {isLoading && characterSheets.length === 0 ? (
        <div className="space-y-2">
          <div className="h-10 animate-pulse rounded-md bg-panel-elevated" />
          <div className="h-10 animate-pulse rounded-md bg-panel-elevated" />
        </div>
      ) : null}

      {!isLoading && characterSheets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          No characters yet. Create one to get started.
        </div>
      ) : null}

      <ul className="space-y-1">
        {characterSheets.map((sheet) => (
          <li key={sheet.id}>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-panel-elevated"
              onClick={() => onSelect(sheet.id)}
            >
              <p className="truncate text-sm text-foreground">{sheet.name}</p>
              {sheet.tagline ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {sheet.tagline}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
