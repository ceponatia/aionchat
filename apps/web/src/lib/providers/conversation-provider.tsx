"use client";

import type { ReactNode } from "react";

import { useAppPreferences } from "@/lib/providers/app-preferences-provider";
import {
  ConversationContext,
  ConversationDraftContext,
} from "@/lib/providers/conversation-context";
import { useConversationProviderValue } from "@/lib/providers/use-conversation-provider-value";

export {
  useConversation,
  useConversationDraft,
} from "@/lib/providers/conversation-context";
export function ConversationProvider({ children }: { children: ReactNode }) {
  const { defaultModel, isDefaultModelHydrated } = useAppPreferences();
  const { conversationValue, draftValue } = useConversationProviderValue({
    defaultModel,
    isDefaultModelHydrated,
  });

  return (
    <ConversationContext.Provider value={conversationValue}>
      <ConversationDraftContext.Provider value={draftValue}>
        {children}
      </ConversationDraftContext.Provider>
    </ConversationContext.Provider>
  );
}
