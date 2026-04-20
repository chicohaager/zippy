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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hidden md:inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs hover:bg-[var(--ink-subtle)] transition"
        title="Provider / Modell wechseln"
      >
        <span>{provider}</span>
        <span className="opacity-50">·</span>
        <span className="font-mono">{model}</span>
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
                  onClick={() => setProvider(p)}
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
