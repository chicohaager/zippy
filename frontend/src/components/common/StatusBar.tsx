import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { ConnectionStatus } from "@/hooks/useWebSocket";
import { ProviderSwitcher } from "./ProviderSwitcher";

interface Props {
  status: ConnectionStatus;
}

export function StatusBar({ status }: Props) {
  const { t } = useTranslation();

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
      <span className="opacity-50">•</span>
      <ProviderSwitcher />
    </div>
  );
}
