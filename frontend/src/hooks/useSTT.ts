import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
}

function getSR(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  return getSR() !== null;
}

/**
 * Push-to-talk speech recognition via the browser's Web Speech API.
 * Returns {isListening, transcript, start, stop, supported}.
 */
export function useSTT() {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);
  const supported = isSTTSupported();

  const start = useCallback(() => {
    if (!supported) return;
    const Ctor = getSR();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = (i18n.resolvedLanguage ?? "en").startsWith("de") ? "de-DE" : "en-US";
    r.continuous = false;
    r.interimResults = true;
    setTranscript("");

    r.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      setTranscript(text);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);

    recogRef.current = r;
    setIsListening(true);
    try {
      r.start();
    } catch {
      setIsListening(false);
    }
  }, [i18n.resolvedLanguage, supported]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recogRef.current?.abort();
    };
  }, []);

  return { isListening, transcript, start, stop, supported };
}
