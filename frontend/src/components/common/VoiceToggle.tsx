import { Volume2, VolumeX } from "lucide-react";
import clsx from "clsx";
import { useSettings } from "@/stores/settingsStore";

export function VoiceToggle() {
  const { voiceOutput, setVoiceOutput } = useSettings();
  return (
    <button
      onClick={() => setVoiceOutput(!voiceOutput)}
      className={clsx(
        "rounded-full p-1.5 transition-colors",
        voiceOutput ? "bg-[var(--accent)] text-white" : "surface hover:bg-[var(--border)]"
      )}
      aria-label={voiceOutput ? "Mute Zippy's voice" : "Unmute Zippy's voice"}
      title={voiceOutput ? "Mute voice" : "Unmute voice"}
    >
      {voiceOutput ? <Volume2 size={14} /> : <VolumeX size={14} />}
    </button>
  );
}
