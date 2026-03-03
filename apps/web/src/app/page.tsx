"use client";

import { useState } from "react";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatShell } from "@/components/chat/chat-shell";
import { MessageList } from "@/components/chat/message-list";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";
import type { AionReasoningDetail, ChatResponseBody } from "@/lib/types";

const TEST_CONVERSATION_ID = "ph03-test-conversation";

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningDetails?: AionReasoningDetail[] | null;
  createdAt: string;
}

interface ApiErrorResponse {
  error?: string;
}

function buildUserMessage(content: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content,
    reasoningDetails: null,
    createdAt: new Date().toISOString(),
  };
}

export default function HomePage() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(): Promise<void> {
    const content = input.trim();
    if (!content || isLoading) {
      return;
    }

    const activeConversationId = conversationId ?? TEST_CONVERSATION_ID;
    if (!conversationId) {
      setConversationId(activeConversationId);
    }

    setMessages((previous) => [...previous, buildUserMessage(content)]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content,
        }),
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorResponse | null;
        throw new Error(body?.error ?? "Unable to send message");
      }

      const body = (await response.json()) as ChatResponseBody;
      setMessages((previous) => [
        ...previous,
        {
          id: body.message.id,
          role: body.message.role,
          content: body.message.content,
          reasoningDetails: body.message.reasoningDetails,
          createdAt: body.message.createdAt,
        },
      ]);
    } catch (err: unknown) {
      const fallbackMessage =
        "Message failed. Ensure a test conversation exists for PH03.";
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat(): void {
    setMessages([]);
    setInput("");
    setConversationId(null);
    setError(null);
    setIsSidebarOpen(false);
  }

  return (
    <ChatShell
      sidebar={<Sidebar onNewChat={handleNewChat} />}
      isSidebarOpen={isSidebarOpen}
      onCloseSidebar={() => setIsSidebarOpen(false)}
    >
      <header className="safe-area-pt border-b border-border bg-panel px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              PH03 Chat UI
            </p>
            <h2 className="text-sm font-medium text-foreground sm:text-base">
              Aion-2.0 Conversation
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            Menu
          </Button>
        </div>
      </header>

      <MessageList messages={messages} isLoading={isLoading} />

      {error ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 text-xs text-rose-300 sm:px-6">
          {error}
        </div>
      ) : null}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </ChatShell>
  );
}
