import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChat } from "@/stores/chatStore";
import { useSettings } from "@/stores/settingsStore";

/**
 * Text-to-speech. Prefer Piper (neural) via /api/speak; fall back to the
 * browser's SpeechSynthesis when the server is unreachable or the request fails.
 */
export function useTTS() {
  const { i18n } = useTranslation();
  const { voiceOutput } = useSettings();
  const messages = useChat((s) => s.messages);
  const isStreaming = useChat((s) => s.isStreaming);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0); // lets us cancel in-flight requests on interrupt
  const lastSpokenIdRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (!voiceOutput) stop();
    return () => stop();
  }, [voiceOutput, stop]);

  useEffect(() => {
    if (!voiceOutput) return;
    if (isStreaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.pending) return;
    const spoken = stripMarkdown(last.content);
    if (!spoken) return;
    if (lastSpokenIdRef.current === last.id) return;
    lastSpokenIdRef.current = last.id;

    const lang = (i18n.resolvedLanguage ?? "en").split("-")[0];
    void speak(spoken, lang);
    async function speak(text: string, lang: string) {
      const myToken = ++tokenRef.current;
      try {
        setIsSpeaking(true);
        const r = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: lang }),
        });
        if (!r.ok) throw new Error(`speak_${r.status}`);
        if (myToken !== tokenRef.current) return; // user interrupted
        const blob = await r.blob();
        if (myToken !== tokenRef.current) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (myToken === tokenRef.current) setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (myToken === tokenRef.current) setIsSpeaking(false);
        };
        await audio.play();
      } catch {
        if (myToken !== tokenRef.current) return;
        fallbackBrowserTTS(text, lang, setIsSpeaking);
      }
    }
  }, [messages, isStreaming, voiceOutput, i18n.resolvedLanguage]);

  return { isSpeaking, stop };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function fallbackBrowserTTS(
  text: string,
  lang: string,
  setIsSpeaking: (v: boolean) => void
) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    setIsSpeaking(false);
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang.startsWith("de") ? "de-DE" : "en-US";
  utter.onstart = () => setIsSpeaking(true);
  utter.onend = () => setIsSpeaking(false);
  utter.onerror = () => setIsSpeaking(false);
  synth.speak(utter);
}
