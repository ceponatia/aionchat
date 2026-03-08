"use client";

import { useEffect, useEffectEvent } from "react";

interface UseEditorKeyboardShortcutsOptions {
  onNewChat: () => void;
  onEscapeCloseSidebar: () => void;
}

export function useEditorKeyboardShortcuts({
  onNewChat,
  onEscapeCloseSidebar,
}: UseEditorKeyboardShortcutsOptions): void {
  const handleKeydown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
      const target = event.target;
      let isEditable = false;

      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        isEditable =
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          target.isContentEditable;
      } else if (document.activeElement instanceof HTMLElement) {
        const activeElement = document.activeElement;
        const tagName = activeElement.tagName;
        isEditable =
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          activeElement.isContentEditable;
      }

      if (!isEditable) {
        event.preventDefault();
        onNewChat();
      }
    }

    if (event.key === "Escape") {
      onEscapeCloseSidebar();
    }
  });

  useEffect(() => {
    function handleDocumentKeydown(event: KeyboardEvent): void {
      handleKeydown(event);
    }

    document.addEventListener("keydown", handleDocumentKeydown);
    return () => document.removeEventListener("keydown", handleDocumentKeydown);
  }, []);
}
