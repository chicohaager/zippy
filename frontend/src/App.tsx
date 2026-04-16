import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useChatSocketInit, useConnectionStatus } from "@/hooks/useWebSocket";
import { ChatContainer } from "@/components/Chat/ChatContainer";
import { ZippyAvatar } from "@/components/Zippy/ZippyAvatar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { VoiceToggle } from "@/components/common/VoiceToggle";
import { StatusBar } from "@/components/common/StatusBar";
import { useChat } from "@/stores/chatStore";

function App() {
  useTheme();
  useChatSocketInit();

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="flex-1 overflow-hidden">
        <ChatContainer />
      </main>
    </div>
  );
}

function TopBar() {
  const { t } = useTranslation();
  const reset = useChat((s) => s.reset);
  const status = useConnectionStatus();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border)]/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <ZippyAvatar size={36} />
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold">{t("app.name")}</div>
          <div className="text-xs text-[var(--ink-muted)]">{t("app.tagline")}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBar status={status} />
        <button
          onClick={reset}
          className="btn-ghost !px-3 !py-1.5 text-xs"
          title={t("chat.new_chat")}
        >
          <Plus size={14} />
          <span className="hidden sm:inline">{t("chat.new_chat")}</span>
        </button>
        <VoiceToggle />
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}

export default App;
