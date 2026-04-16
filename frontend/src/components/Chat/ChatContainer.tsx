import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useChat } from "@/stores/chatStore";
import { sendChatMessage, useConnectionStatus } from "@/hooks/useWebSocket";
import { useTTS } from "@/hooks/useTTS";
import { MessageBubble } from "./MessageBubble";
import { InputArea } from "./InputArea";
import { ZippyAvatar, type ZippyState } from "@/components/Zippy/ZippyAvatar";

export function ChatContainer() {
  const { messages, isStreaming } = useChat();
  const status = useConnectionStatus();
  const { isSpeaking } = useTTS();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const last = messages[messages.length - 1];
  const mascotState: ZippyState = isSpeaking
    ? "speaking"
    : isStreaming
      ? last?.content
        ? "speaking"
        : "thinking"
      : "idle";

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {empty ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border)]/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-end gap-3 px-4 py-3">
          <div className="hidden sm:block">
            <ZippyAvatar state={mascotState} size={48} />
          </div>
          <div className="flex-1">
            <InputArea onSend={sendChatMessage} disabled={status !== "connected"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ZippyAvatar state="idle" size={140} />
      <h1 className="mt-6 font-display text-3xl font-semibold">
        {t("chat.empty_title")}
      </h1>
      <p className="mt-2 max-w-md text-[var(--ink-muted)]">
        {t("chat.empty_subtitle")}
      </p>
    </div>
  );
}
