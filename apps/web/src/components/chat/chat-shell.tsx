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
    <div className="relative flex h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-8%] h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <aside className="glass-panel relative z-10 hidden w-80 border-r border-white/10 bg-panel/85 lg:block">
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
            className="h-full w-full bg-slate-950/70 backdrop-blur-sm"
            aria-label="Close sidebar"
            onClick={onCloseSidebar}
          />
          <aside className="glass-panel animate-surface-in relative h-full w-80 border-r border-white/10 bg-panel/90">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
