import { useEffect, useRef, useState } from "react";

// Phase (d)-2 renderer. Runs in the transparent click-through tauri window
// "point-overlay". It listens for a single "draw-point" event from the rust
// backend and animates a terracotta ring + label at the normalized
// (x, y) ∈ [0,1] position, scaled to the monitor dimensions the rust side
// passed through. The rust side auto-hides the window after 3.5 s; this
// component drives its own CSS fade so the ring dissolves a beat earlier.

interface PointPayload {
  x: number;
  y: number;
  label?: string | null;
  monitor_width: number;
  monitor_height: number;
}

interface Pin {
  id: number;
  xPx: number;
  yPx: number;
  label: string | null;
}

type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type TauriListen = <T>(
  event: string,
  cb: (evt: { payload: T }) => void,
) => Promise<() => void>;

interface TauriGlobal {
  __TAURI__?: {
    core?: { invoke?: TauriInvoke };
    event?: { listen?: TauriListen };
    invoke?: TauriInvoke;
  };
  __TAURI_INTERNALS__?: { invoke?: TauriInvoke };
}

function getListen(): TauriListen | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as TauriGlobal;
  return w.__TAURI__?.event?.listen ?? null;
}

export function PointOverlay() {
  const [pins, setPins] = useState<Pin[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const listen = getListen();
    if (!listen) {
      // eslint-disable-next-line no-console
      console.warn("[point-overlay] tauri event.listen missing — not in a tauri env");
      return;
    }
    let unlisten: (() => void) | null = null;
    listen<PointPayload>("draw-point", ({ payload }) => {
      const id = nextId.current++;
      const xPx = Math.round(payload.x * payload.monitor_width);
      const yPx = Math.round(payload.y * payload.monitor_height);
      const label = payload.label?.trim() ? payload.label : null;
      setPins((prev) => [...prev, { id, xPx, yPx, label }]);
      // Self-clean after the CSS animation finishes.
      window.setTimeout(() => {
        setPins((prev) => prev.filter((p) => p.id !== id));
      }, 3200);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      {pins.map((p) => (
        <div
          key={p.id}
          className="zippy-point-pin"
          style={{
            position: "absolute",
            left: p.xPx,
            top: p.yPx,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="zippy-point-ring" />
          <div className="zippy-point-dot" />
          {p.label && <div className="zippy-point-label">{p.label}</div>}
        </div>
      ))}
      <style>{`
        .zippy-point-ring {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 4px solid #e07a5f;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.55), 0 6px 20px rgba(224,122,95,0.55);
          opacity: 0;
          animation: zippy-ring-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.4) forwards,
                     zippy-pulse 1.4s ease-in-out 0.35s 2,
                     zippy-fade-out 0.5s ease-in 2.7s forwards;
        }
        .zippy-point-dot {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #e07a5f;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.75);
          opacity: 0;
          animation: zippy-dot-in 0.25s ease-out 0.15s forwards,
                     zippy-fade-out 0.5s ease-in 2.7s forwards;
        }
        .zippy-point-label {
          position: absolute;
          top: 56px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          background: rgba(33, 25, 20, 0.92);
          color: #faf6ef;
          padding: 4px 10px;
          border-radius: 999px;
          font: 500 13px/1.2 "Nunito", system-ui, sans-serif;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          opacity: 0;
          animation: zippy-label-in 0.3s ease-out 0.25s forwards,
                     zippy-fade-out 0.5s ease-in 2.7s forwards;
        }
        @keyframes zippy-ring-in {
          from { opacity: 0; transform: scale(0.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes zippy-dot-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes zippy-label-in {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes zippy-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.55), 0 6px 20px rgba(224,122,95,0.55); }
          50%      { box-shadow: 0 0 0 6px rgba(255,255,255,0.25), 0 10px 30px rgba(224,122,95,0.75); }
        }
        @keyframes zippy-fade-out {
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
