import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useChatSocketInit, useConnectionStatus } from "@/hooks/useWebSocket";
import { ChatContainer } from "@/components/Chat/ChatContainer";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ZippyAvatar } from "@/components/Zippy/ZippyAvatar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { VoiceToggle } from "@/components/common/VoiceToggle";
import { StatusBar } from "@/components/common/StatusBar";

function App() {
  useTheme();
  useChatSocketInit();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden">
          <ChatContainer />
        </main>
      </div>
    </div>
  );
}

function TopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { t } = useTranslation();
  const status = useConnectionStatus();

  return (
    <header
      data-tauri-drag-region
      className="flex select-none items-center justify-between gap-4 border-b border-[var(--border)]/60 px-4 py-3"
    >
      <div data-tauri-drag-region className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--border)] md:hidden"
          aria-label={t("sidebar.open")}
        >
          <Menu size={18} />
        </button>
        <ZippyAvatar size={36} />
        <div data-tauri-drag-region className="leading-tight">
          <div data-tauri-drag-region className="font-display text-lg font-semibold">{t("app.name")}</div>
          <div data-tauri-drag-region className="text-xs text-[var(--ink-muted)]">{t("app.tagline")}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBar status={status} />
        <VoiceToggle />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}

export default App;
