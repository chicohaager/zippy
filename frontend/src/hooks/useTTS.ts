import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChat } from "@/stores/chatStore";
import { useSettings } from "@/stores/settingsStore";

/**
 * Text-to-speech via the browser's SpeechSynthesis API.
 *
 * - Auto-speaks each completed assistant message when voiceOutput is enabled.
 * - Picks the best-matching OS voice for the current i18n language.
 * - Exposes {isSpeaking, stop} for UI (mascot animation, interrupt button).
 */
export function useTTS() {
  const { i18n } = useTranslation();
  const { voiceOutput } = useSettings();
  const messages = useChat((s) => s.messages);
  const isStreaming = useChat((s) => s.isStreaming);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenIdRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // Cancel speech on unmount or when disabled.
  useEffect(() => {
    if (!voiceOutput) stop();
    return () => {
      stop();
    };
  }, [voiceOutput, stop]);

  // Speak the latest completed assistant message.
  useEffect(() => {
    if (!voiceOutput) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (isStreaming) return;

    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.pending) return;
    if (!last.content.trim()) return;
    if (lastSpokenIdRef.current === last.id) return;

    lastSpokenIdRef.current = last.id;
    speak(last.content, i18n.resolvedLanguage ?? "en", setIsSpeaking);
  }, [messages, isStreaming, voiceOutput, i18n.resolvedLanguage]);

  return { isSpeaking, stop };
}

function speak(
  text: string,
  lang: string,
  setIsSpeaking: (v: boolean) => void
) {
  const synth = window.speechSynthesis;
  synth.cancel();

  // Strip markdown-ish syntax so the voice doesn't say "asterisk".
  const spoken = text
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

  if (!spoken) return;

  const utter = new SpeechSynthesisUtterance(spoken);
  utter.lang = lang.startsWith("de") ? "de-DE" : "en-US";
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  const voice = pickVoice(utter.lang);
  if (voice) utter.voice = voice;

  utter.onstart = () => setIsSpeaking(true);
  utter.onend = () => setIsSpeaking(false);
  utter.onerror = () => setIsSpeaking(false);

  synth.speak(utter);
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer exact match, then language prefix, then anything.
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const prefix = lang.split("-")[0];
  const byPrefix = voices.find((v) => v.lang.startsWith(prefix));
  return byPrefix ?? null;
}
