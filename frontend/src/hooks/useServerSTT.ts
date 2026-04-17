import { useCallback, useEffect, useRef, useState } from "react";
import i18n from "@/i18n";

type State = "idle" | "recording" | "transcribing";

/**
 * Server-side STT via MediaRecorder + POST /api/transcribe.
 * Works on all modern browsers (incl. iPad Safari) — no webkitSpeechRecognition needed.
 */
export function useServerSTT(onTranscript: (text: string) => void) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => () => cleanup(), []);

  const start = useCallback(async () => {
    if (!supported || state !== "idle") return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mime = mimes.find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        cleanup();
        if (blob.size === 0) {
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const form = new FormData();
          const ext = (rec.mimeType || "webm").includes("mp4") ? "m4a" : "webm";
          form.append("audio", blob, `voice.${ext}`);
          const lang = (i18n.language || "auto").split("-")[0];
          form.append("language", lang);
          const r = await fetch("/api/transcribe", { method: "POST", body: form });
          if (!r.ok) throw new Error(`http_${r.status}`);
          const json = (await r.json()) as { text?: string };
          if (json.text && json.text.trim()) onTranscript(json.text.trim());
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setState("idle");
        }
      };
      recorderRef.current = rec;
      rec.start();
      setState("recording");
    } catch (e) {
      setError((e as Error).message);
      cleanup();
      setState("idle");
    }
  }, [supported, state, onTranscript]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  return { start, stop, state, error, supported };
}
