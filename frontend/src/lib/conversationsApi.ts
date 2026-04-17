export interface ConversationSummary {
  id: number;
  title: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: number;
  title: string;
  messages: { id: number; role: "user" | "assistant"; content: string; created_at: string }[];
}

const BASE = "/api/conversations";

export async function listConversations(): Promise<ConversationSummary[]> {
  const r = await fetch(BASE);
  if (!r.ok) throw new Error(`list_failed:${r.status}`);
  return r.json();
}

export async function getConversation(id: number): Promise<ConversationDetail> {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error(`get_failed:${r.status}`);
  return r.json();
}

export async function renameConversation(id: number, title: string): Promise<void> {
  const r = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error(`rename_failed:${r.status}`);
}

export async function deleteConversation(id: number): Promise<void> {
  const r = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`delete_failed:${r.status}`);
}

export async function deleteMessage(convId: number, msgId: number): Promise<void> {
  const r = await fetch(`${BASE}/${convId}/messages/${msgId}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`delete_msg_failed:${r.status}`);
}
