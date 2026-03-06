import type { LucideIcon } from "lucide-react";
import {
  Check,
  Copy,
  GitBranch,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface MessageActionsProps {
  role: "user" | "assistant";
  isLastAssistant: boolean;
  isDisabled: boolean;
  didCopy: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onBranch: (() => void) | null;
  onRegenerate: (() => void) | null;
  onDelete: () => void;
}

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  isDisabled: boolean;
  onClick: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  isDisabled,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-inherit/80 transition hover:bg-black/10 hover:text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

export function MessageActions({
  role,
  isLastAssistant,
  isDisabled,
  didCopy,
  onCopy,
  onEdit,
  onBranch,
  onRegenerate,
  onDelete,
}: MessageActionsProps) {
  return (
    <div className="mb-2 flex flex-wrap justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <ActionButton
        icon={didCopy ? Check : Copy}
        label={didCopy ? "Copied" : "Copy"}
        isDisabled={isDisabled}
        onClick={onCopy}
      />
      <ActionButton
        icon={Pencil}
        label="Edit"
        isDisabled={isDisabled}
        onClick={onEdit}
      />
      {role === "user" && onBranch ? (
        <ActionButton
          icon={GitBranch}
          label="Branch"
          isDisabled={isDisabled}
          onClick={onBranch}
        />
      ) : null}
      {role === "assistant" && isLastAssistant && onRegenerate ? (
        <ActionButton
          icon={RefreshCw}
          label="Regenerate"
          isDisabled={isDisabled}
          onClick={onRegenerate}
        />
      ) : null}
      <ActionButton
        icon={Trash2}
        label="Delete"
        isDisabled={isDisabled}
        onClick={onDelete}
      />
    </div>
  );
}