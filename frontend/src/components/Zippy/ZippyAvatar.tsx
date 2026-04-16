import clsx from "clsx";

export type ZippyState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  state?: ZippyState;
  size?: number;
  className?: string;
}

/**
 * Zippy mascot — an original friendly orb character with eyes.
 * Designed to feel warm and approachable without infringing on Clippy trademarks.
 */
export function ZippyAvatar({ state = "idle", size = 64, className }: Props) {
  const isThinking = state === "thinking";
  const isListening = state === "listening";

  return (
    <div
      className={clsx("relative select-none", className)}
      style={{ width: size, height: size }}
      aria-label="Zippy"
      role="img"
    >
      <svg
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx(
          "h-full w-full drop-shadow-[0_8px_16px_rgba(201,111,74,0.25)]",
          state !== "thinking" && "animate-breathe"
        )}
      >
        <defs>
          <radialGradient id="zippy-body" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#F3D3B5" />
            <stop offset="55%" stopColor="#E0916E" />
            <stop offset="100%" stopColor="#A85634" />
          </radialGradient>
          <radialGradient id="zippy-cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB8A0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFB8A0" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Body (tilted egg) */}
        <ellipse
          cx="60"
          cy="64"
          rx="44"
          ry="48"
          fill="url(#zippy-body)"
          transform="rotate(-6 60 64)"
        />

        {/* Highlight */}
        <ellipse cx="42" cy="38" rx="14" ry="9" fill="#fff" opacity="0.35" />

        {/* Cheeks */}
        <ellipse cx="38" cy="72" rx="8" ry="5" fill="url(#zippy-cheek)" />
        <ellipse cx="82" cy="72" rx="8" ry="5" fill="url(#zippy-cheek)" />

        {/* Eyes */}
        <g
          className={clsx(
            !isThinking && "animate-blink",
            isListening && "translate-y-[-1px]"
          )}
          style={{ transformOrigin: "center 58px" }}
        >
          <ellipse cx="46" cy="58" rx="4" ry="5.5" fill="#2C1E13" />
          <ellipse cx="74" cy="58" rx="4" ry="5.5" fill="#2C1E13" />
          <circle cx="47.2" cy="56" r="1.3" fill="#fff" />
          <circle cx="75.2" cy="56" r="1.3" fill="#fff" />
        </g>

        {/* Mouth */}
        {state === "speaking" ? (
          <ellipse cx="60" cy="80" rx="7" ry="4" fill="#2C1E13" />
        ) : isListening ? (
          <path
            d="M50 82 Q60 76 70 82"
            stroke="#2C1E13"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M52 80 Q60 86 68 80"
            stroke="#2C1E13"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Tiny antenna curl (signature) */}
        <path
          d="M68 20 Q74 14 70 8"
          stroke="#C96F4A"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="70" cy="7" r="2.5" fill="#C96F4A" />
      </svg>

      {isThinking && (
        <div className="absolute -right-1 -top-1 flex gap-1 rounded-full surface-elevated px-2 py-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce-dot" />
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce-dot"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce-dot"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      )}
    </div>
  );
}
