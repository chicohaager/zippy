import { Monitor, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useSettings, type ThemeMode } from "@/stores/settingsStore";

const options: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useSettings();
  return (
    <div className="flex items-center gap-0.5 rounded-full surface p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={clsx(
            "rounded-full p-1.5 transition-colors",
            theme === value
              ? "bg-[var(--accent)] text-white"
              : "hover:bg-[var(--border)]"
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
