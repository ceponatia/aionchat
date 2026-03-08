import { useEffect, useState } from "react";

import { InlineEditor } from "@/components/chat/inline-editor";
import { MarkdownContent } from "@/components/chat/markdown-content";
import { MessageActions } from "@/components/chat/message-actions";
import { ReasoningPanel } from "@/components/chat/reasoning-panel";
import type { ConversationMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ConversationMessage;
  isLastAssistant: boolean;
  isDisabled: boolean;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onRegenerate: (messageId: string) => Promise<void>;
  onBranch: (messageId: string, content: string) => Promise<void>;
  onResend: (messageId: string) => Promise<void>;
}

// eslint-disable-next-line max-lines-per-function -- interactive message bubble manages copy, inline edit, branch, and delete flows
export function MessageBubble({
  message,
  isLastAssistant,
  isDisabled,
  onEdit,
  onDelete,
  onRegenerate,
  onBranch,
  onResend,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const roleLabel = isUser ? "You" : "Aion";
  const isTransientMessage =
    message.id.startsWith("local-user-") ||
    message.id.startsWith("stream-assistant-");
  const areActionsDisabled = isDisabled || isTransientMessage;
  const [didCopy, setDidCopy] = useState(false);
  const [editMode, setEditMode] = useState<"none" | "edit" | "branch">("none");
  const [editContent, setEditContent] = useState(message.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!didCopy) {
      return;
    }

    const timeoutId = window.setTimeout(() => setDidCopy(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [didCopy]);

  useEffect(() => {
    if (editMode === "none") {
      setEditContent(message.content);
    }
  }, [editMode, message.content]);

  async function handleCopy(): Promise<void> {
    const text = message.content;

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Position off-screen to avoid affecting layout
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("Fallback copy command was unsuccessful");
        }
      }

      setDidCopy(true);
    } catch (error) {
      // Avoid unhandled rejections and surface the failure for debugging
      // UI will simply not show "Copied" on failure.
      console.error("Failed to copy text to clipboard:", error);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editMode === "branch") {
        await onBranch(message.id, editContent);
      } else {
        await onEdit(message.id, editContent);
      }

      setEditMode("none");
    } catch {
      return;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Delete this message? This action cannot be undone.")) {
      return;
    }

    try {
      await onDelete(message.id);
    } catch {
      return;
    }
  }

  function startEditing(mode: "edit" | "branch"): void {
    setEditContent(message.content);
    setEditMode(mode);
  }

  const bubbleClassName = isUser
    ? `group rounded-[28px] rounded-br-md border border-cyan-200/20 bg-linear-to-br from-cyan-300 via-sky-300 to-emerald-300 px-4 py-3 text-sm text-slate-950 shadow-[0_22px_50px_-30px_rgba(34,211,238,0.9)] ${editMode === "none" ? "max-w-[88%]" : "w-full max-w-[88%]"}`
    : `group rounded-[28px] rounded-bl-md border border-white/10 bg-slate-900/72 px-4 py-3 text-sm text-slate-100 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.95)] backdrop-blur-md ${editMode === "none" ? "max-w-[88%]" : "w-full max-w-[88%]"}`;

  return (
    <article className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={bubbleClassName}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-inherit/70">
            {roleLabel}
          </span>
        </div>
        {editMode === "none" ? (
          <>
            <MessageActions
              role={message.role}
              isLastAssistant={isLastAssistant}
              isDisabled={areActionsDisabled}
              didCopy={didCopy}
              onCopy={() => {
                void handleCopy();
              }}
              onEdit={() => startEditing("edit")}
              onBranch={
                isUser
                  ? () => {
                      startEditing("branch");
                    }
                  : null
              }
              onResend={
                isUser
                  ? () => {
                      void onResend(message.id).catch(() => undefined);
                    }
                  : null
              }
              onRegenerate={
                !isUser
                  ? () => {
                      void onRegenerate(message.id).catch(() => undefined);
                    }
                  : null
              }
              onDelete={() => {
                void handleDelete();
              }}
            />

            {!isUser && message.reasoningDetails?.length ? (
              <ReasoningPanel details={message.reasoningDetails} />
            ) : null}

            <MarkdownContent content={message.content} />
          </>
        ) : (
          <InlineEditor
            value={editContent}
            onChange={setEditContent}
            onSave={() => {
              void handleSubmit();
            }}
            onCancel={() => setEditMode("none")}
            isSubmitting={isSubmitting}
            saveLabel={editMode === "branch" ? "Save & Resend" : "Save"}
          />
        )}
      </div>
    </article>
  );
}
