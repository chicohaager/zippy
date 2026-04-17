import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus, X } from "lucide-react";
import { useChat } from "@/stores/chatStore";
import {
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  type ConversationSummary,
} from "@/lib/conversationsApi";
import { ConversationItem } from "./ConversationItem";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const activeId = useChat((s) => s.conversationId);
  const isStreaming = useChat((s) => s.isStreaming);
  const hydrate = useChat((s) => s.hydrateConversation);
  const reset = useChat((s) => s.reset);

  const refresh = useCallback(async () => {
    try {
      const list = await listConversations();
      setItems(list);
    } catch {
      // silent — list will just stay stale, user can retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh after a new conversation appears or a stream completes
  // (updated_at changes → list order shifts).
  useEffect(() => {
    refresh();
  }, [activeId, refresh]);

  useEffect(() => {
    if (!isStreaming) refresh();
  }, [isStreaming, refresh]);

  const handleOpen = async (id: number) => {
    try {
      const conv = await getConversation(id);
      hydrate(
        conv.id,
        conv.messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
      );
      onClose();
    } catch {
      // keep sidebar open, silent fail
    }
  };

  const handleRename = async (id: number, title: string) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await renameConversation(id, title);
    } catch {
      await refresh();
      throw new Error("rename_failed");
    }
  };

  const handleDelete = async (id: number) => {
    const prev = items;
    setItems((cur) => cur.filter((c) => c.id !== id));
    try {
      await deleteConversation(id);
      if (activeId === id) reset();
    } catch {
      setItems(prev);
    }
  };

  const handleNew = () => {
    reset();
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--border)]/60 bg-[var(--surface)] transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/60 px-4 py-3">
          <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
            {t("sidebar.title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--border)] md:hidden"
            aria-label={t("sidebar.close")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3 py-2">
          <button
            onClick={handleNew}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]/60 hover:text-[var(--accent)] transition"
          >
            <MessageSquarePlus size={16} />
            {t("sidebar.new")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="px-2 py-4 text-xs text-[var(--ink-muted)]">…</div>
          ) : items.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-[var(--ink-muted)]">
              {t("sidebar.empty")}
            </div>
          ) : (
            <div className="space-y-0.5">
              {items.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  onOpen={handleOpen}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
