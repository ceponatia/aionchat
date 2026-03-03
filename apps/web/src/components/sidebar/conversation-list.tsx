const PLACEHOLDER_CONVERSATIONS = [
  "Session Placeholder",
  "Another Conversation",
  "PH04: Persistence Coming Soon",
];

export function ConversationList() {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <ul className="space-y-2">
        {PLACEHOLDER_CONVERSATIONS.map((title) => (
          <li key={title}>
            <button
              type="button"
              className="w-full rounded-md border border-transparent px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:border-border hover:bg-panel-elevated"
            >
              {title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
