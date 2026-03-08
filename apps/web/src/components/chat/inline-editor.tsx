import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

const MAX_TEXTAREA_HEIGHT = 200;

interface InlineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  saveLabel?: string;
}

export function InlineEditor({
  value,
  onChange,
  onSave,
  onCancel,
  isSubmitting,
  saveLabel = "Save",
}: InlineEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSave = value.trim().length > 0 && !isSubmitting;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Escape" && !isSubmitting) {
      event.preventDefault();
      onCancel();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSave) {
        onSave();
      }
    }
  }

  return (
    <div className="min-w-0 w-full space-y-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={isSubmitting}
        className="min-h-24 w-full resize-none overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
        aria-label="Edit message"
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!canSave}>
          {isSubmitting ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
