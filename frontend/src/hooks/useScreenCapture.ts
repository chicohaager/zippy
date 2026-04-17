import { useCallback, useRef, useState } from "react";

const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;

async function resizeToDataURL(source: HTMLVideoElement | HTMLImageElement, sw: number, sh: number): Promise<string | null> {
  if (!sw || !sh) return null;
  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, dw, dh);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live screen capture needs a secure context (HTTPS or localhost).
  // http://<lan-ip>:<port> is NOT secure in Chrome → getDisplayMedia unavailable.
  const liveSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";

  const captureLive = useCallback(async (): Promise<string | null> => {
    if (!liveSupported) return null;
    setIsCapturing(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (!track) return null;
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      return await resizeToDataURL(video, video.videoWidth, video.videoHeight);
    } catch {
      return null;
    } finally {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setIsCapturing(false);
    }
  }, [liveSupported]);

  const pickFile = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      let input = fileInputRef.current;
      if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      const cleanup = () => {
        input!.onchange = null;
        input!.value = "";
      };
      input.onchange = async () => {
        const f = input!.files?.[0];
        cleanup();
        if (!f) return resolve(null);
        setIsCapturing(true);
        try {
          const rawUrl = URL.createObjectURL(f);
          const img = new Image();
          img.src = rawUrl;
          await new Promise((r, j) => {
            img.onload = () => r(null);
            img.onerror = j;
          });
          const out = await resizeToDataURL(img, img.naturalWidth, img.naturalHeight);
          URL.revokeObjectURL(rawUrl);
          resolve(out);
        } catch {
          resolve(null);
        } finally {
          setIsCapturing(false);
        }
      };
      input.click();
    });
  }, []);

  // Single entry: live if available, else file picker.
  const captureScreen = useCallback(async (): Promise<string | null> => {
    return liveSupported ? await captureLive() : await pickFile();
  }, [liveSupported, captureLive, pickFile]);

  return { captureScreen, isCapturing, supported: true, liveSupported };
}
