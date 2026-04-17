import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import type { ConversationSummary } from "@/lib/conversationsApi";

interface Props {
  conversation: ConversationSummary;
  active: boolean;
  onOpen: (id: number) => void;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function ConversationItem({ conversation, active, onOpen, onRename, onDelete }: Props) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const commitRename = async () => {
    const next = draft.trim();
    if (!next || next === conversation.title) {
      setEditing(false);
      setDraft(conversation.title);
      return;
    }
    try {
      await onRename(conversation.id, next);
      setEditing(false);
    } catch {
      setDraft(conversation.title);
      setEditing(false);
    }
  };

  const cancelRename = () => {
    setDraft(conversation.title);
    setEditing(false);
  };

  const confirmDelete = async () => {
    if (!confirm(t("sidebar.confirm_delete"))) return;
    setMenuOpen(false);
    await onDelete(conversation.id);
  };

  return (
    <div
      ref={itemRef}
      className={`group relative flex items-center gap-1 rounded-xl px-2 py-1.5 transition ${
        active
          ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/50"
          : "hover:bg-[var(--border)]/50"
      }`}
    >
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") cancelRename();
            }}
            className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            maxLength={200}
          />
          <button
            onClick={commitRename}
            className="rounded-lg p-1.5 text-[var(--accent)] hover:bg-[var(--border)]"
            title={t("sidebar.save")}
          >
            <Check size={14} />
          </button>
          <button
            onClick={cancelRename}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--border)]"
            title={t("sidebar.cancel")}
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onOpen(conversation.id)}
            className="flex-1 min-w-0 truncate text-left text-sm"
            title={conversation.title}
          >
            {conversation.title}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`rounded-lg p-1.5 text-[var(--ink-muted)] transition ${
              menuOpen ? "bg-[var(--border)]" : "opacity-0 hover:bg-[var(--border)] group-hover:opacity-100"
            }`}
            aria-label="menu"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-2 top-9 z-20 w-36 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg"
              role="menu"
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--border)]/60"
              >
                <Pencil size={13} /> {t("sidebar.rename")}
              </button>
              <button
                onClick={confirmDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
              >
                <Trash2 size={13} /> {t("sidebar.delete")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
