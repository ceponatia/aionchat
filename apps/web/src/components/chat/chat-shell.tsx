import type { ReactNode } from "react";

interface ChatShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export function ChatShell({
  sidebar,
  children,
  isSidebarOpen,
  onCloseSidebar,
}: ChatShellProps) {
  return (
    <div className="flex h-dvh bg-background text-foreground">
      <aside className="hidden w-70 border-r border-border bg-panel lg:block">
        {sidebar}
      </aside>

      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="h-full w-full bg-black/65"
            aria-label="Close sidebar"
            onClick={onCloseSidebar}
          />
          <aside className="relative h-full w-70 border-r border-border bg-panel">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
