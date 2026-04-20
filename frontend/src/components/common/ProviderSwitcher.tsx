import { useEffect, useRef, useState } from "react";
import { useSettings, type Provider } from "@/stores/settingsStore";

interface ProvidersResponse {
  providers: string[];
  default: string;
  models: Record<string, string[]>;
}

export function ProviderSwitcher() {
  const { provider, model, setProvider, setModel } = useSettings();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((d: ProvidersResponse) => setData(d))
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const models = data?.models?.[provider] ?? [];

  // When switching providers, always sync the active model to the first one
  // that's actually available on that provider. Otherwise the store's
  // hardcoded fallback (e.g. "qwen2.5" without tag) can point at a model
  // that isn't pulled — ollama then 404s on /api/chat.
  const switchProvider = (p: Provider) => {
    setProvider(p);
    const available = data?.models?.[p] ?? [];
    if (available.length > 0) setModel(available[0]);
  };

  // Auto-heal: if the currently selected model isn't in the list we just
  // loaded (e.g. persisted from an older session), snap it to the first
  // available one so the next send doesn't blow up.
  useEffect(() => {
    if (!data) return;
    const list = data.models?.[provider] ?? [];
    if (list.length > 0 && !list.includes(model)) {
      setModel(list[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, provider]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-[9rem] items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-xs hover:bg-[var(--ink-subtle)] transition"
        title={`${provider} · ${model} — klicken zum Wechseln`}
      >
        <span className="truncate">{provider}</span>
        <span className="opacity-50">·</span>
        <span className="font-mono truncate">{model}</span>
        <span className="ml-0.5 opacity-50">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-[var(--ink-subtle)] bg-[var(--surface)] p-3 shadow-lg">
          <div className="mb-3">
            <label className="block text-[0.65rem] uppercase tracking-wider opacity-60 mb-1">
              Provider
            </label>
            <div className="flex gap-1">
              {(["anthropic", "ollama"] as Provider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => switchProvider(p)}
                  className={
                    "flex-1 rounded px-2 py-1 text-xs transition " +
                    (provider === p
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--ink-subtle)] hover:bg-[var(--ink-muted)]/20")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[0.65rem] uppercase tracking-wider opacity-60 mb-1">
              Modell
            </label>
            {models.length === 0 ? (
              <div className="text-xs opacity-60 italic">
                {provider === "ollama"
                  ? "Keine Modelle — ollama pull <name>"
                  : "Lade…"}
              </div>
            ) : (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded border border-[var(--ink-subtle)] bg-[var(--surface)] px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
