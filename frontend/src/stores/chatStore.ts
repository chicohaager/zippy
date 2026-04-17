import { create } from "zustand";

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  dbId?: number;
  role: Role;
  content: string;
  pending?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  conversationId: number | null;
  isStreaming: boolean;
  addUserMessage: (text: string) => void;
  startAssistantMessage: () => string;
  appendAssistantDelta: (id: string, text: string) => void;
  finishAssistantMessage: (id: string) => void;
  setConversationId: (id: number) => void;
  setStreaming: (v: boolean) => void;
  markSaved: (role: Role, dbId: number) => void;
  removeMessage: (dbId: number) => void;
  hydrateConversation: (
    id: number,
    msgs: { id: number; role: Role; content: string }[]
  ) => void;
  reset: () => void;
}

const rid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const useChat = create<ChatState>((set) => ({
  messages: [],
  conversationId: null,
  isStreaming: false,

  addUserMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: rid(), role: "user", content: text }],
    })),

  startAssistantMessage: () => {
    const id = rid();
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "assistant", content: "", pending: true },
      ],
      isStreaming: true,
    }));
    return id;
  },

  appendAssistantDelta: (id, text) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + text } : m
      ),
    })),

  finishAssistantMessage: (id) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, pending: false } : m
      ),
      isStreaming: false,
    })),

  setConversationId: (id) => set({ conversationId: id }),
  setStreaming: (v) => set({ isStreaming: v }),

  markSaved: (role, dbId) =>
    set((s) => {
      // Assign the dbId to the LAST message of this role that does not yet
      // have one. Walk backwards so we always pick the freshest match.
      const next = [...s.messages];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === role && next[i].dbId === undefined) {
          next[i] = { ...next[i], dbId };
          return { messages: next };
        }
      }
      return {};
    }),

  removeMessage: (dbId) =>
    set((s) => ({ messages: s.messages.filter((m) => m.dbId !== dbId) })),

  hydrateConversation: (id, msgs) =>
    set({
      conversationId: id,
      isStreaming: false,
      messages: msgs.map((m) => ({
        id: rid(),
        dbId: m.id,
        role: m.role,
        content: m.content,
      })),
    }),

  reset: () => set({ messages: [], conversationId: null, isStreaming: false }),
}));
