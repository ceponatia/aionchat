import type { ConversationTagItem, TagItem } from "@/lib/types";

interface TagAssignmentPanelProps {
  allTags: TagItem[];
  conversationTags: ConversationTagItem[];
  onToggleTag: (tagId: string, isSelected: boolean) => void;
}

export function TagAssignmentPanel({
  allTags,
  conversationTags,
  onToggleTag,
}: TagAssignmentPanelProps) {
  if (allTags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Create tags above, then assign them here.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((tag) => {
        const isSelected = conversationTags.some((item) => item.id === tag.id);

        return (
          <button
            key={tag.id}
            type="button"
            className="rounded-full border px-3 py-1.5 text-xs"
            style={
              isSelected
                ? {
                    borderColor: tag.color,
                    backgroundColor: `${tag.color}22`,
                    color: tag.color,
                  }
                : {
                    borderColor: "rgba(255,255,255,0.1)",
                    color: tag.color,
                  }
            }
            onClick={() => onToggleTag(tag.id, isSelected)}
          >
            {isSelected ? "Remove" : "Add"} {tag.name}
          </button>
        );
      })}
    </div>
  );
}