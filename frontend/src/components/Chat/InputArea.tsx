import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Send, Mic, MicOff } from "lucide-react";
import clsx from "clsx";
import { useSTT } from "@/hooks/useSTT";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function InputArea({ onSend, disabled }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, transcript, start, stop, supported } = useSTT();

  // Mirror live transcript into the textarea so user sees what's being heard.
  useEffect(() => {
    if (isListening) {
      setValue(transcript);
      if (textareaRef.current) autosize(textareaRef.current);
    }
  }, [transcript, isListening]);

  // When STT ends with a final transcript, send it automatically.
  const prevListening = useRef(false);
  useEffect(() => {
    if (prevListening.current && !isListening) {
      const text = transcript.trim();
      if (text) {
        onSend(text);
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    }
    prevListening.current = isListening;
  }, [isListening, transcript, onSend]);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const toggleMic = () => {
    if (isListening) stop();
    else start();
  };

  return (
    <div className="surface-elevated rounded-chat p-2 shadow-sm">
      <div className="flex items-end gap-2">
        {supported && (
          <button
            type="button"
            onClick={toggleMic}
            onContextMenu={(e) => e.preventDefault()}
            disabled={disabled}
            className={clsx(
              "btn-ghost !rounded-full !p-2.5",
              isListening && "!bg-[var(--accent)] !text-white animate-pulse"
            )}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            title={isListening ? "Listening… click to stop" : "Click to speak"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
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
          placeholder={isListening ? "…" : t("chat.placeholder")}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 outline-none placeholder:text-[var(--ink-muted)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
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
