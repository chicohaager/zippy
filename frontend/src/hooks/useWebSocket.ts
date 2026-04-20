import { useEffect, useSyncExternalStore } from "react";
import { useChat } from "@/stores/chatStore";
import { useSettings } from "@/stores/settingsStore";

// Resolve the tauri invoke channel if we're running inside the desktop
// overlay, so a claude point_at can be rendered as a real on-screen ring by
// the point-overlay window instead of just an inline text hint in the chat.
type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    __TAURI__?: { core?: { invoke?: TauriInvoke }; invoke?: TauriInvoke };
    __TAURI_INTERNALS__?: { invoke?: TauriInvoke };
  };
  return (
    w.__TAURI__?.core?.invoke
    ?? w.__TAURI__?.invoke
    ?? w.__TAURI_INTERNALS__?.invoke
    ?? null
  );
}

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
          // Phase (d)-2: inside the desktop overlay, fire the tauri
          // show_point command so the transparent full-monitor window draws
          // an actual ring at the claude-reported coordinates. In the
          // browser (no tauri), fall back to the phase-(d)-1 inline text
          // annotation so the user still gets *something* useful.
          if (typeof data.x === "number" && typeof data.y === "number") {
            const invoke = getTauriInvoke();
            const label = data.label ?? null;
            if (invoke) {
              void invoke("show_point", { x: data.x, y: data.y, label }).catch((e) => {
                // eslint-disable-next-line no-console
                console.warn("[zippy] show_point failed:", e);
              });
            } else if (this.currentAssistantId) {
              const shown = label && label.trim() ? label : "hier";
              const xPct = Math.round(data.x * 100);
              const yPct = Math.round(data.y * 100);
              chat.appendAssistantDelta(
                this.currentAssistantId,
                `\n\n📍 **${shown}** — x: ${xPct}%, y: ${yPct}%`
              );
            }
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
