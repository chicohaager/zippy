import { useTranslation } from "react-i18next";
import clsx from "clsx";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage?.slice(0, 2) ?? "en";
  return (
    <div className="flex items-center gap-0.5 rounded-full surface p-0.5 text-xs font-semibold">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={clsx(
            "rounded-full px-2.5 py-1 transition-colors",
            current === code
              ? "bg-[var(--accent)] text-white"
              : "hover:bg-[var(--border)]"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
