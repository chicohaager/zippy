import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { Check, Copy, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useChat, type ChatMessage } from "@/stores/chatStore";
import { deleteMessage } from "@/lib/conversationsApi";

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const conversationId = useChat((s) => s.conversationId);
  const removeMessage = useChat((s) => s.removeMessage);

  const canDelete =
    typeof message.dbId === "number" &&
    typeof conversationId === "number" &&
    !message.pending;

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!confirm(t("chat.confirm_delete_msg"))) return;
    const dbId = message.dbId!;
    removeMessage(dbId);
    try {
      await deleteMessage(conversationId!, dbId);
    } catch {
      // Could re-hydrate to restore; silent for MVP.
    }
  };

  return (
    <div
      className={clsx(
        "group flex w-full items-start gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && canDelete && (
        <DeleteButton onClick={handleDelete} label={t("chat.delete_msg")} />
      )}
      <div className={clsx(isUser ? "message-user" : "message-assistant", "prose-tight")}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre: CodeBlock,
            }}
          >
            {message.content || ""}
          </ReactMarkdown>
        )}
        {message.pending && !message.content && (
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--ink-muted)] animate-bounce-dot" />
            <span
              className="h-2 w-2 rounded-full bg-[var(--ink-muted)] animate-bounce-dot"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-[var(--ink-muted)] animate-bounce-dot"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        )}
      </div>
      {isUser && canDelete && (
        <DeleteButton onClick={handleDelete} label={t("chat.delete_msg")} />
      )}
    </div>
  );
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 rounded-full p-1.5 text-[var(--ink-muted)] opacity-0 transition hover:bg-[var(--border)] hover:text-red-600 group-hover:opacity-100 focus:opacity-100 dark:hover:text-red-400"
      aria-label={label}
      title={label}
    >
      <Trash2 size={13} />
    </button>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const textContent = extractText(children);
  const copy = async () => {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group relative">
      <pre>{children}</pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded-md surface-elevated px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}
