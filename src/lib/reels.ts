import type { ReelsSectionSettings } from "./api";

export const REEL_CATEGORIES = [
  "Dental Education",
  "Patient Experiences",
  "Clinic Activities",
  "Treatment Awareness",
  "Dentist Videos",
  "Reels & Shorts",
] as const;

export type ReelCategory = (typeof REEL_CATEGORIES)[number];

export const REELS_STORAGE_QUOTA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB (2048MB)

export const DEFAULT_REELS_SECTION_SETTINGS: ReelsSectionSettings = {
  enabled: true,
  heading: "Trending Reels & Videos",
  subtitle:
    "Watch real patient experiences, dental care videos, clinic moments and educational content.",
};

export function formatStorageBytes(bytes: number): string {
  const safe = Math.max(0, Number(bytes || 0));
  if (safe >= 1024 * 1024 * 1024) {
    return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (safe >= 1024 * 1024) {
    return `${(safe / (1024 * 1024)).toFixed(safe >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  }
  if (safe >= 1024) {
    return `${Math.round(safe / 1024)} KB`;
  }
  return `${safe} B`;
}

export function formatFileSizeMB(bytes: number): string {
  const safe = Math.max(0, Number(bytes || 0));
  return `${(safe / (1024 * 1024)).toFixed(1)} MB`;
}

const SUPPORTED_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "m4v"]);
const SUPPORTED_VIDEO_MIMES = new Set([
  "video/mp4",
  "application/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/m4v",
]);

export function isSupportedVideoFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = (file.type || "").toLowerCase().split(";")[0].trim();
  if (SUPPORTED_VIDEO_MIMES.has(mime)) return true;
  if ((!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") && SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
    return true;
  }
  return SUPPORTED_VIDEO_EXTENSIONS.has(ext);
}

export function deriveTitleFromFilename(filename: string): string {
  const withoutExt = String(filename || "Dental Reel")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutExt) return "Clinic Dental Reel";
  return withoutExt.replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 120);
}

/**
 * Generates a lightweight JPEG poster thumbnail from a local Video File without
 * reading the full video into JS memory. Returns null gracefully if unsupported.
 */
export async function captureVideoThumbnail(file: File): Promise<File | null> {
  if (typeof document === "undefined" || typeof URL === "undefined") return null;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const cleanup = () => {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  return new Promise<File | null>((resolve) => {
    let settled = false;
    const finish = (result: File | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(null), 8000);

    const captureFrame = () => {
      try {
        const vw = video.videoWidth || 720;
        const vh = video.videoHeight || 1280;
        const maxSide = 720;
        const scale = Math.min(1, maxSide / Math.max(vw, vh));
        const width = Math.max(160, Math.round(vw * scale));
        const height = Math.max(240, Math.round(vh * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size === 0) {
              finish(null);
              return;
            }
            const base = file.name.replace(/\.[^/.]+$/, "") || "reel";
            finish(new File([blob], `${base}-poster.jpg`, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.84
        );
      } catch {
        finish(null);
      }
    };

    video.onloadeddata = () => {
      const targetTime = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(0.8, Math.max(0.05, video.duration * 0.2))
        : 0;
      if (targetTime <= 0.05) {
        captureFrame();
        return;
      }
      video.onseeked = captureFrame;
      try {
        video.currentTime = targetTime;
      } catch {
        captureFrame();
      }
    };

    video.onerror = () => finish(null);
    video.src = objectUrl;
  });
}

export const SITE_CONTENT_SYNC_CHANNEL = "ssd-site-content-sync";
export const SITE_CONTENT_SYNC_KEY = "ssd_site_content_version";

/** Broadcasts live CMS changes to both same-tab listeners and open public website tabs. */
export function notifySiteContentUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("site-content-updated"));
  try {
    localStorage.setItem(SITE_CONTENT_SYNC_KEY, String(Date.now()));
  } catch {
    // Ignore storage quota / private mode restrictions
  }
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const ch = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
      ch.postMessage({ type: "updated", at: Date.now() });
      ch.close();
    } catch {
      // Ignore unsupported BroadcastChannel contexts
    }
  }
}
