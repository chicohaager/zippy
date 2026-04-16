import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type Provider = "anthropic" | "ollama";

interface SettingsState {
  theme: ThemeMode;
  provider: Provider;
  model: string;
  voiceOutput: boolean;
  setTheme: (theme: ThemeMode) => void;
  setProvider: (provider: Provider) => void;
  setModel: (model: string) => void;
  setVoiceOutput: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      voiceOutput: true,
      setTheme: (theme) => set({ theme }),
      setProvider: (provider) =>
        set({
          provider,
          model:
            provider === "anthropic"
              ? "claude-sonnet-4-20250514"
              : "qwen2.5",
        }),
      setModel: (model) => set({ model }),
      setVoiceOutput: (voiceOutput) => set({ voiceOutput }),
    }),
    { name: "zippy.settings" }
  )
);
