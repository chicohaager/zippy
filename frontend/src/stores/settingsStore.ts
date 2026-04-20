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
        // Model stays whatever it was; the ProviderSwitcher syncs it to the
        // first actually-available model from /api/providers once loaded.
        // Anthropic path still gets a sensible fallback because its model
        // list is stable/hardcoded server-side.
        set((s) => ({
          provider,
          model:
            provider === "anthropic" && !s.model.startsWith("claude-")
              ? "claude-sonnet-4-20250514"
              : s.model,
        })),
      setModel: (model) => set({ model }),
      setVoiceOutput: (voiceOutput) => set({ voiceOutput }),
    }),
    { name: "zippy.settings" }
  )
);
