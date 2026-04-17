import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Send, Mic, MicOff, Loader2, Monitor, X } from "lucide-react";
import clsx from "clsx";
import { useServerSTT } from "@/hooks/useServerSTT";
import { useScreenCapture } from "@/hooks/useScreenCapture";

interface Props {
  onSend: (text: string, image?: string | null) => void;
  disabled?: boolean;
}

export function InputArea({ onSend, disabled }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTranscript = useCallback(
    (text: string) => {
      onSend(text, screenshot);
      setScreenshot(null);
    },
    [onSend, screenshot]
  );

  const {
    start: sttStart,
    stop: sttStop,
    state: sttState,
    supported: sttSupported,
  } = useServerSTT(handleTranscript);

  const {
    captureScreen,
    isCapturing,
    supported: screenSupported,
    liveSupported,
  } = useScreenCapture();

  const submit = () => {
    const text = value.trim();
    if (!text && !screenshot) return;
    onSend(text, screenshot);
    setValue("");
    setScreenshot(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const toggleMic = () => {
    if (sttState === "recording") sttStop();
    else if (sttState === "idle") sttStart();
  };

  const handleCapture = async () => {
    const img = await captureScreen();
    if (img) setScreenshot(img);
  };

  const canSubmit = !disabled && (value.trim().length > 0 || !!screenshot);
  const micBusy = sttState === "transcribing";
  const micRecording = sttState === "recording";

  return (
    <div className="surface-elevated rounded-chat p-2 shadow-sm">
      {screenshot && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
          <img
            src={screenshot}
            alt="screen preview"
            className="h-14 w-24 rounded-lg object-cover ring-1 ring-[var(--border)]"
          />
          <span className="flex-1 text-xs text-[var(--ink-muted)]">
            {t("chat.screen_attached")}
          </span>
          <button
            type="button"
            onClick={() => setScreenshot(null)}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--border)]"
            aria-label={t("chat.screen_remove")}
            title={t("chat.screen_remove")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {screenSupported && (
          <button
            type="button"
            onClick={handleCapture}
            onContextMenu={(e) => e.preventDefault()}
            disabled={disabled || isCapturing}
            className={clsx(
              "btn-ghost !rounded-full !p-2.5",
              screenshot && "!bg-[var(--accent)] !text-white",
              isCapturing && "animate-pulse"
            )}
            aria-label={liveSupported ? t("chat.screen") : t("chat.screen_upload")}
            title={liveSupported ? t("chat.screen") : t("chat.screen_upload")}
          >
            <Monitor size={18} />
          </button>
        )}
        {sttSupported && (
          <button
            type="button"
            onClick={toggleMic}
            onContextMenu={(e) => e.preventDefault()}
            disabled={disabled || micBusy}
            className={clsx(
              "btn-ghost !rounded-full !p-2.5",
              micRecording && "!bg-[var(--accent)] !text-white animate-pulse"
            )}
            aria-label={micRecording ? t("chat.stop") : t("chat.speak")}
            title={
              micBusy
                ? t("chat.transcribing")
                : micRecording
                  ? t("chat.listening")
                  : t("chat.speak")
            }
          >
            {micBusy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : micRecording ? (
              <MicOff size={18} />
            ) : (
              <Mic size={18} />
            )}
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autosize(e.currentTarget);
          }}
          onKeyDown={handleKey}
          placeholder={
            micRecording
              ? t("chat.listening")
              : micBusy
                ? t("chat.transcribing")
                : t("chat.placeholder")
          }
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-[var(--ink-muted)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="btn-accent disabled:opacity-40"
          aria-label={t("chat.send")}
        >
          <Send size={16} />
          <span className="hidden sm:inline">{t("chat.send")}</span>
        </button>
      </div>
      <p className="px-3 pt-1 text-[11px] text-[var(--ink-muted)]">
        {t("chat.send_hint")}
      </p>
    </div>
  );
}

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
}
