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
    <div className="safe-area-pb border-t border-border bg-panel px-4 pb-4 pt-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Aion-2.0"
          aria-label="Message input"
          rows={1}
          className="min-h-10 flex-1 resize-none overflow-y-auto rounded-md border border-input bg-input px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:text-sm"
          style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
        />
        <Button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="min-w-20"
          aria-label="Send message"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
