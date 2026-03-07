import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

const MAX_TEXTAREA_HEIGHT = 200;

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isLoading;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!canSend) {
      return;
    }

    onSend();
    textareaRef.current?.focus();
  }

  return (
    <div className="safe-area-pb px-4 pb-4 pt-3 sm:px-6 lg:px-8">
      <div className="glass-panel animate-surface-in mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[30px] px-4 py-4 sm:px-5">
        <div className="flex items-end gap-3">
          <div className="flex-1 rounded-3xl border border-white/10 bg-slate-950/35 p-1 shadow-inner shadow-black/20">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write the next turn, scene beat, or instruction for Aion..."
              aria-label="Message input"
              rows={1}
              className="min-h-12 w-full resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:text-sm"
              style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
            />
          </div>
          <Button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="min-w-24"
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          <span>Enter to send</span>
          <span>Shift + Enter for newline</span>
        </div>
      </div>
    </div>
  );
}
