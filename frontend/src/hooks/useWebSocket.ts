import { useEffect, useSyncExternalStore } from "react";
import { useChat } from "@/stores/chatStore";
import { useSettings } from "@/stores/settingsStore";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface ServerMessage {
  type: "start" | "delta" | "end" | "conversation" | "error" | "saved" | "point";
  text?: string;
  error?: string;
  conversationId?: number;
  id?: number;
  title?: string;
  provider?: string;
  model?: string;
  role?: "user" | "assistant";
  x?: number;
  y?: number;
  label?: string | null;
}

const wsUrl = () => {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws`;
};

/**
 * Module-level WebSocket singleton. Exactly one connection is opened for the
 * entire app; multiple components subscribe via the hooks below.
 */
class ChatSocket {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private listeners = new Set<() => void>();
  private reconnectAttempt = 0;
  private currentAssistantId: string | null = null;
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  private connect() {
    this.setStatus("connecting");
    const ws = new WebSocket(wsUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus("connected");
      this.reconnectAttempt = 0;
    };

    ws.onclose = () => {
      this.setStatus("disconnected");
      const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 15000);
      this.reconnectAttempt += 1;
      setTimeout(() => this.connect(), delay);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (ev) => {
      let data: ServerMessage;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      const chat = useChat.getState();
      switch (data.type) {
        case "conversation":
          if (data.id) chat.setConversationId(data.id);
          break;
        case "saved":
          if (data.role && typeof data.id === "number") {
            chat.markSaved(data.role, data.id);
          }
          break;
        case "start":
          this.currentAssistantId = chat.startAssistantMessage();
          if (data.conversationId) chat.setConversationId(data.conversationId);
          break;
        case "delta":
          if (this.currentAssistantId && data.text) {
            chat.appendAssistantDelta(this.currentAssistantId, data.text);
          }
          break;
        case "end":
          if (this.currentAssistantId) {
            chat.finishAssistantMessage(this.currentAssistantId);
            this.currentAssistantId = null;
          }
          break;
        case "point":
          // Phase (d)-1 interim render: until the dedicated transparent
          // canvas-overlay lands in phase (d)-2/3, surface the point as an
          // inline annotation inside the current assistant bubble. If claude
          // only fired a tool_use block with no text, this also becomes the
          // whole visible response — otherwise the user sees "no answer".
          if (this.currentAssistantId && typeof data.x === "number" && typeof data.y === "number") {
            const label = data.label && data.label.trim() ? data.label : "hier";
            const xPct = Math.round(data.x * 100);
            const yPct = Math.round(data.y * 100);
            chat.appendAssistantDelta(
              this.currentAssistantId,
              `\n\n📍 **${label}** — x: ${xPct}%, y: ${yPct}% (Zippy zeigt — Overlay-Canvas kommt in Iter.2)`
            );
          }
          break;
        case "error":
          if (this.currentAssistantId) {
            chat.appendAssistantDelta(
              this.currentAssistantId,
              `\n\n⚠️ ${data.error ?? "unknown error"}`
            );
            chat.finishAssistantMessage(this.currentAssistantId);
            this.currentAssistantId = null;
          }
          break;
      }
    };
  }

  send(text: string, image?: string | null) {
    const trimmed = text.trim();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!trimmed && !image) return;
    const chat = useChat.getState();
    const { provider, model } = useSettings.getState();
    const displayText = trimmed || (image ? "📷 Screen" : "");
    chat.addUserMessage(displayText);
    this.ws.send(
      JSON.stringify({
        type: "chat",
        text: trimmed,
        provider,
        model,
        conversationId: chat.conversationId,
        ...(image ? { image } : {}),
      })
    );
  }

  getStatus = () => this.status;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.listeners.forEach((l) => l());
  }
}

const socket = new ChatSocket();

export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(socket.subscribe, socket.getStatus, socket.getStatus);
}

export function useChatSocketInit() {
  useEffect(() => {
    socket.start();
  }, []);
}

export function sendChatMessage(text: string, image?: string | null) {
  socket.send(text, image);
}
