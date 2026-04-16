import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";
import type { ChatMessage } from "@/stores/chatStore";

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}>
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
    </div>
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
