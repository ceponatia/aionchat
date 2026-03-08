"use client";

import { useCallback, useMemo, useState } from "react";

import type { ActivePanel } from "@/lib/providers/editor-context";

interface EditorPanelsState {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  activePanel: ActivePanel;
  toggleSettings: () => void;
  toggleSummary: () => void;
  togglePromptInspector: () => void;
  closePanels: () => void;
}

export function useEditorPanels(): EditorPanelsState {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const togglePanel = useCallback((panel: Exclude<ActivePanel, null>) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const closePanels = useCallback(() => setActivePanel(null), []);
  const toggleSettings = useCallback(
    () => togglePanel("settings"),
    [togglePanel],
  );
  const toggleSummary = useCallback(
    () => togglePanel("summary"),
    [togglePanel],
  );
  const togglePromptInspector = useCallback(
    () => togglePanel("prompt-inspector"),
    [togglePanel],
  );

  return useMemo(
    () => ({
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      activePanel,
      toggleSettings,
      toggleSummary,
      togglePromptInspector,
      closePanels,
    }),
    [
      activePanel,
      closePanels,
      closeSidebar,
      isSidebarOpen,
      openSidebar,
      togglePromptInspector,
      toggleSettings,
      toggleSummary,
    ],
  );
}
