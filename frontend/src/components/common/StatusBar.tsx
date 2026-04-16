import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { ConnectionStatus } from "@/hooks/useWebSocket";
import { useSettings } from "@/stores/settingsStore";

interface Props {
  status: ConnectionStatus;
}

export function StatusBar({ status }: Props) {
  const { t } = useTranslation();
  const { provider, model } = useSettings();

  const label =
    status === "connected"
      ? t("status.connected")
      : status === "connecting"
        ? t("status.connecting")
        : t("status.disconnected");

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--ink-muted)]">
      <span className="flex items-center gap-1.5">
        <span
          className={clsx(
            "h-2 w-2 rounded-full",
            status === "connected" && "bg-emerald-500",
            status === "connecting" && "bg-amber-400 animate-pulse",
            status === "disconnected" && "bg-rose-500"
          )}
        />
        {label}
      </span>
      <span className="hidden md:inline">•</span>
      <span className="hidden md:inline">
        {provider} · <span className="font-mono">{model}</span>
      </span>
    </div>
  );
}
