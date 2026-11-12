export type Role = "patient" | "admin";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export type Booking = {
  id: number;
  ref: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  service: string;
  serviceLabel: string;
  date: string;
  dateLabel: string;
  time: string;
  dentist: string;
  notes: string;
  status: BookingStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  whatsapp?: { patient: string | null; clinic: string | null };
  sms?: { patient: string | null };
};

export const SITE_CONTENT_TYPES = ["hero", "blog", "offer", "gallery", "reel", "video", "image", "badge", "treatment", "doctor", "achievement", "testimonial", "before_after", "google_review"] as const;
export type SiteContentType = (typeof SITE_CONTENT_TYPES)[number];

export type SiteContent = {
  id: number;
  type: SiteContentType;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  excerpt: string;
  body: string;
  mediaUrl: string;
  mobileMediaUrl: string;
  logoUrl: string;
  beforeImage: string;
  afterImage: string;
  linkUrl: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  badgeText: string;
  ratingScore: string;
  ratingVerified: boolean;
  reviewCount: string;
  trustBadgeText: string;
  startDate: string;
  endDate: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  price: number;
  sessions: string;
  duration: string;
  availableForBooking: boolean;
  qualification: string;
  specialization: string;
  yearsExperience: string;
  registrationNumber: string;
  phone: string;
  email: string;
  homepageHighlight: boolean;
  patientConsent: boolean;
  published: boolean;
  displayOrder: number;
  description?: string;
  content?: string;
  readTime?: string;
  media_url?: string;
  before_image?: string;
  after_image?: string;
  display_order?: number;
  fileSize?: number;
  mimeType?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReelsSectionSettings = {
  enabled: boolean;
  heading: string;
  subtitle: string;
};

export type ReelsStorageUsage = {
  usedBytes: number;
  quotaBytes: number;
  availableBytes: number;
  usedPercent: number;
  videoCount: number;
};

export type GoogleReviewSource = "google_api";

export type GoogleReviewItem = {
  id: number;
  author: string;
  rating: number;
  comment: string;
  reviewDate: string;
  relativeTime: string;
  source: GoogleReviewSource;
  authorPhotoUrl: string;
  reviewUrl: string;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GoogleReviewsStatus = "synced" | "api_key_missing" | "place_id_missing" | "sync_error" | "empty";

export type GoogleReviewsConfig = {
  googleReviewsUrl: string;
  googleMapsUri: string;
  writeReviewUrl: string;
  effectiveWriteReviewUrl: string;
  placeId: string;
  businessName: string;
  overallRating: number | null;
  totalReviews: number | null;
  lastSyncedAt: string;
  lastSyncError: string;
  syncSource: "google_api" | "unconfigured";
};

export type GoogleReviewsResponse = {
  status: GoogleReviewsStatus;
  apiConfigured: boolean;
  cached?: boolean;
  issue?: string;
  maxApiReviewsNotice?: string;
  config: GoogleReviewsConfig;
  reviews: GoogleReviewItem[];
};

export type AdminGoogleReviewsResponse = GoogleReviewsResponse & {
  envPlaceIdConfigured: boolean;
  cacheMinutes: number;
};

export const DEFAULT_GOOGLE_REVIEWS_URL = "https://share.google/SOW6zQnrpqeVVJPPh";

export const DEFAULT_GOOGLE_REVIEWS_CONFIG: GoogleReviewsConfig = {
  googleReviewsUrl: DEFAULT_GOOGLE_REVIEWS_URL,
  googleMapsUri: "",
  writeReviewUrl: "",
  effectiveWriteReviewUrl: DEFAULT_GOOGLE_REVIEWS_URL,
  placeId: "",
  businessName: "Sri Saraswathi Dental Clinic",
  overallRating: null,
  totalReviews: null,
  lastSyncedAt: "",
  lastSyncError: "",
  syncSource: "unconfigured",
};

export type ResumableUploadProgress = {
  loadedBytes: number;
  totalBytes: number;
  remainingBytes: number;
  percent: number;
  phase: "preparing" | "uploading" | "finalizing";
};

export type ResumableResumeState = {
  uploadId?: string;
  key?: string;
  url?: string;
  mimeType?: string;
  partSize?: number;
  totalParts?: number;
  completedParts?: Array<{ partNumber: number; etag: string }>;
};

export type Slot = { time: string; remaining: number };
export type Availability = { date: string; closed: boolean; slots: Slot[] };

export type PatientAccount = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  visits: number;
  lastVisit: string | null;
  joinedAt: string;
  lastLoginAt: string | null;
  loginCount: number;
};

export type AdminSummary = {
  today: string;
  counts: {
    today: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    patients: number;
    totalBookings: number;
  };
  week: { date: string; label: string; count: number }[];
  todaySchedule: Booking[];
  queue: Booking[];
  recent: Booking[];
  recentPatients: Pick<PatientAccount, "id" | "name" | "email" | "phone" | "role" | "joinedAt" | "lastLoginAt" | "loginCount">[];
  recentLogins: { id: number; name: string; email: string; phone: string; lastLoginAt: string; loginCount: number }[];
};


export type WhatsAppSettings = {
  enabled: boolean;
  clinicPhone: string;
  clinicInternational: string;
  clinicName: string;
  provider: "green_api" | "ultramsg" | "n8n" | "meta" | "both" | "simulated";
  greenApiInstanceId?: string;
  greenApiToken?: string;
  ultraMsgInstanceId?: string;
  ultraMsgToken?: string;
  n8nWebhookUrl: string;
  n8nAuthToken: string;
  metaPhoneNumberId: string;
  metaWabaId: string;
  metaAccessToken?: string;
  metaAccessTokenConfigured?: boolean;
  metaAccessTokenPreview?: string;
  notifyNewBooking: boolean;
  notifyConfirmed: boolean;
  notifyRejected: boolean;
  notifyRescheduled: boolean;
  notifyReminder: boolean;
  notifyCustomReply: boolean;
  templates: {
    newBookingClinic: string;
    patientConfirmed: string;
    patientRejected: string;
    patientRescheduled: string;
    patientReminder: string;
  };
};

export type WhatsAppLogItem = {
  id: number;
  event: string;
  recipient: string;
  recipientType: "clinic" | "patient";
  patientName: string;
  ref: string;
  message: string;
  provider: string;
  status: "delivered" | "sent" | "failed" | "simulated" | "skipped";
  results?: Array<{ provider: string; status: string; code?: number; error?: string; messageId?: string; info?: string }>;
  error: string | null;
  created_at: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(status: number, message: string, code?: string, data?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (err) {
    if ((err instanceof DOMException && err.name === "AbortError") || init?.signal?.aborted) {
      throw new DOMException("Upload cancelled", "AbortError");
    }
    throw new ApiError(0, "Clinic account service is unreachable. Please try again shortly.");
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(response.status, "Clinic account service is not configured for this site yet.");
    }
  }

  if (!response.ok) {
    let message = "";
    if (data && typeof data === "object") {
      if ("error" in data && (data as { error: unknown }).error) {
        message = String((data as { error: unknown }).error);
      } else if ("message" in data && (data as { message: unknown }).message) {
        message = String((data as { message: unknown }).message);
      }
    } else if (typeof data === "string" && data.trim() && !data.trim().startsWith("<") && data.trim().length < 240) {
      message = data.trim();
    }
    if (!message) {
      if (response.status === 413) {
        message = "File is too large for server proxy upload. Try a smaller file or verify R2 direct upload.";
      } else if (response.status === 502 || response.status === 504) {
        message = "Upload gateway timed out. Please try again.";
      } else {
        message = response.statusText
          ? `Request failed (${response.status} ${response.statusText}).`
          : "Something went wrong. Please try again.";
      }
    }
    const code =
      data && typeof data === "object" && "code" in data && (data as { code: unknown }).code
        ? String((data as { code: unknown }).code)
        : undefined;
    throw new ApiError(response.status, message, code, data);
  }

  return data as T;
}

export function resolveApiAsset(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/api/") ? API_BASE_URL + value : value;
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  ogv: "video/ogg",
  "3gp": "video/3gpp",
  mkv: "video/x-matroska",
};

export function detectMediaMimeType(file: File, folder: string = "gallery"): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const rawMime = (file.type || "").toLowerCase().split(";")[0].trim();
  if (!rawMime || rawMime === "application/octet-stream" || rawMime === "binary/octet-stream") {
    return EXT_MIME[ext] || (folder === "reels" ? "video/mp4" : "image/jpeg");
  }
  return rawMime;
}

function xhrPut({
  url,
  body,
  headers = {},
  withCredentials = false,
  signal,
  onProgress,
}: {
  url: string;
  body: Blob | File;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<{ status: number; etag: string; responseText: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.withCredentials = withCredentials;

    for (const [k, v] of Object.entries(headers)) {
      if (v) xhr.setRequestHeader(k, v);
    }

    const cleanupAbort = () => {
      signal?.removeEventListener("abort", handleAbort);
    };

    const handleAbort = () => {
      xhr.abort();
      cleanupAbort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });

    xhr.upload.onprogress = (evt) => {
      if (onProgress) {
        onProgress(evt.loaded, evt.lengthComputable ? evt.total : body.size);
      }
    };

    xhr.onload = () => {
      cleanupAbort();
      const etag = xhr.getResponseHeader("ETag") || xhr.getResponseHeader("etag") || "";
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, etag, responseText: xhr.responseText || "" });
        return;
      }
      let msg = `Upload failed with status ${xhr.status}.`;
      try {
        const parsed = JSON.parse(xhr.responseText || "{}");
        if (parsed?.error) msg = String(parsed.error);
      } catch {
        // ignore XML/non-JSON response bodies
      }
      reject(new ApiError(xhr.status, msg));
    };

    xhr.onerror = () => {
      cleanupAbort();
      reject(new Error("Network error occurred during video upload. You can retry without losing progress."));
    };

    xhr.onabort = () => {
      cleanupAbort();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    xhr.send(body);
  });
}

const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 3;

function buildUploadResumeStorageKey(file: File, folder: string, replaceContentId?: number) {
  return `ssd-reel-upload:${folder}:${replaceContentId ?? "new"}:${file.name}:${file.size}:${file.lastModified}`;
}

function readPersistedResumeState(storageKey: string): ResumableResumeState | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ResumableResumeState;
    return parsed?.uploadId && parsed?.key ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writePersistedResumeState(storageKey: string, state: ResumableResumeState | null) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!state) {
      sessionStorage.removeItem(storageKey);
    } else {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getGoogleReviews: () =>
    request<GoogleReviewsResponse>("/api/google-reviews", { cache: "no-store" }),
  getAdminGoogleReviews: () =>
    request<AdminGoogleReviewsResponse>("/api/admin/google-reviews", { cache: "no-store" }),
  updateGoogleReviewsConfig: (payload: Partial<Pick<GoogleReviewsConfig, "googleReviewsUrl" | "writeReviewUrl" | "placeId" | "businessName">>) =>
    request<{ config: GoogleReviewsConfig; apiConfigured: boolean }>("/api/admin/google-reviews/config", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  syncGoogleReviews: (placeId?: string) =>
    request<{
      status: GoogleReviewsStatus;
      config: GoogleReviewsConfig;
      reviews: GoogleReviewItem[];
      importedCount: number;
      apiConfigured: boolean;
    }>("/api/admin/google-reviews/sync", {
      method: "POST",
      body: JSON.stringify(placeId ? { placeId } : {}),
    }),
  cleanupUnreferencedMedia: (urls: string[]) =>
    request<{ ok: boolean }>("/api/admin/uploads/cleanup", {
      method: "POST",
      body: JSON.stringify({ urls: urls.filter(Boolean) }),
    }).catch(() => ({ ok: false })),
  abortMultipartUpload: (key: string, uploadId: string) =>
    request<{ ok: boolean }>("/api/admin/uploads/multipart/abort", {
      method: "POST",
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => ({ ok: false })),
  uploadVideoResumable: async (
    file: File,
    {
      folder = "reels",
      replaceContentId,
      signal,
      resumeState,
      abortOnCancel = false,
      onProgress,
      onResumeStateChange,
    }: {
      folder?: string;
      replaceContentId?: number;
      signal?: AbortSignal;
      resumeState?: ResumableResumeState;
      abortOnCancel?: boolean;
      onProgress?: (progress: ResumableUploadProgress) => void;
      onResumeStateChange?: (state: ResumableResumeState | undefined) => void;
    } = {}
  ) => {
    if (!file || file.size === 0) {
      throw new ApiError(400, "Choose a non-empty video file to upload.");
    }
    if (signal?.aborted) {
      throw new DOMException("Upload cancelled", "AbortError");
    }

    const mimeType = detectMediaMimeType(file, folder);
    const resumeStorageKey = buildUploadResumeStorageKey(file, folder, replaceContentId);
    const initialResume = resumeState?.uploadId ? resumeState : readPersistedResumeState(resumeStorageKey);
    let maxReportedLoaded = 0;

    const report = (loadedBytes: number, phase: ResumableUploadProgress["phase"]) => {
      if (!onProgress) return;
      const clampedLoaded = Math.min(file.size, Math.max(maxReportedLoaded, loadedBytes));
      maxReportedLoaded = clampedLoaded;
      const rawPct = file.size > 0 ? Math.round((clampedLoaded / file.size) * 100) : 0;
      const percent = phase === "finalizing" ? Math.max(99, rawPct) : Math.min(99, rawPct);
      onProgress({
        loadedBytes: clampedLoaded,
        totalBytes: file.size,
        remainingBytes: Math.max(0, file.size - clampedLoaded),
        percent,
        phase,
      });
    };

    report(0, "preparing");

    const useMultipart = file.size > MULTIPART_THRESHOLD_BYTES || Boolean(initialResume?.uploadId);

    if (useMultipart) {
      let state: ResumableResumeState = {
        ...initialResume,
        completedParts: [...(initialResume?.completedParts || [])],
      };

      try {
        if (!state.uploadId || !state.key) {
          const initRes = await request<{
            uploadId: string;
            key: string;
            url: string;
            mimeType: string;
            partSize: number;
            totalParts: number;
          }>("/api/admin/uploads/multipart/init", {
            method: "POST",
            signal,
            body: JSON.stringify({
              filename: file.name || "reel.mp4",
              mimeType,
              folder,
              size: file.size,
              replaceContentId,
            }),
          });
          state = {
            uploadId: initRes.uploadId,
            key: initRes.key,
            url: initRes.url,
            mimeType: initRes.mimeType || mimeType,
            partSize: initRes.partSize || MULTIPART_THRESHOLD_BYTES,
            totalParts: initRes.totalParts,
            completedParts: [],
          };
          writePersistedResumeState(resumeStorageKey, state);
          onResumeStateChange?.(state);
        }

        const partSize = state.partSize || MULTIPART_THRESHOLD_BYTES;
        const totalParts = state.totalParts || Math.max(1, Math.ceil(file.size / partSize));
        const completedMap = new Map<number, string>(
          (state.completedParts || []).map((p) => [p.partNumber, p.etag])
        );
        const inFlightBytes = new Map<number, number>();

        const computeTotalLoaded = () => {
          let sum = 0;
          for (const partNo of completedMap.keys()) {
            const start = (partNo - 1) * partSize;
            const end = Math.min(file.size, start + partSize);
            sum += Math.max(0, end - start);
          }
          for (const [partNo, loaded] of inFlightBytes.entries()) {
            if (!completedMap.has(partNo)) sum += loaded;
          }
          return sum;
        };

        report(computeTotalLoaded(), "uploading");

        const pendingPartNumbers: number[] = [];
        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
          if (!completedMap.has(partNumber)) {
            pendingPartNumbers.push(partNumber);
          }
        }

        let cursor = 0;
        const workerCount = Math.min(MULTIPART_CONCURRENCY, Math.max(1, pendingPartNumbers.length));
        const uploadPartWorker = async () => {
          while (cursor < pendingPartNumbers.length) {
            if (signal?.aborted) {
              throw new DOMException("Upload cancelled", "AbortError");
            }
            const partNumber = pendingPartNumbers[cursor];
            cursor += 1;

            const start = (partNumber - 1) * partSize;
            const end = Math.min(file.size, start + partSize);
            const chunk = file.slice(start, end);

            const signed = await request<{
              direct: boolean;
              uploadUrl: string;
            }>("/api/admin/uploads/multipart/sign-part", {
              method: "POST",
              signal,
              body: JSON.stringify({
                key: state.key,
                uploadId: state.uploadId,
                partNumber,
              }),
            });

            const targetUrl = signed.direct ? signed.uploadUrl : `${API_BASE_URL}${signed.uploadUrl}`;
            const putRes = await xhrPut({
              url: targetUrl,
              body: chunk,
              headers: signed.direct ? {} : { "Content-Type": "application/octet-stream" },
              withCredentials: !signed.direct,
              signal,
              onProgress: (loaded) => {
                inFlightBytes.set(partNumber, Math.min(loaded, chunk.size));
                report(computeTotalLoaded(), "uploading");
              },
            });

            let partEtag = putRes.etag;
            if (!partEtag && putRes.responseText) {
              try {
                const parsed = JSON.parse(putRes.responseText);
                if (parsed?.etag) partEtag = String(parsed.etag);
              } catch {
                // ignore
              }
            }
            if (!partEtag) {
              throw new Error("Storage did not expose chunk ETag. Check bucket CORS ExposeHeaders for ETag.");
            }

            inFlightBytes.delete(partNumber);
            completedMap.set(partNumber, partEtag);
            state.completedParts = Array.from(completedMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([pNo, etag]) => ({ partNumber: pNo, etag }));
            writePersistedResumeState(resumeStorageKey, state);
            onResumeStateChange?.({ ...state });
            report(computeTotalLoaded(), "uploading");
          }
        };

        if (pendingPartNumbers.length > 0) {
          await Promise.all(Array.from({ length: workerCount }, () => uploadPartWorker()));
        }

        report(file.size, "finalizing");
        const completed = await request<{
          url: string;
          key: string;
          size: number;
          mimeType: string;
          success?: boolean;
        }>("/api/admin/uploads/multipart/complete", {
          method: "POST",
          signal,
          body: JSON.stringify({
            key: state.key,
            uploadId: state.uploadId,
            parts: state.completedParts,
            replaceContentId,
          }),
        });

        writePersistedResumeState(resumeStorageKey, null);
        onResumeStateChange?.(undefined);
        onProgress?.({
          loadedBytes: file.size,
          totalBytes: file.size,
          remainingBytes: 0,
          percent: 100,
          phase: "finalizing",
        });

        return {
          url: completed.url,
          key: completed.key,
          mimeType: completed.mimeType || state.mimeType || mimeType,
          size: completed.size || file.size,
          success: true,
        };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (abortOnCancel && state.key && state.uploadId) {
            writePersistedResumeState(resumeStorageKey, null);
            onResumeStateChange?.(undefined);
            request("/api/admin/uploads/multipart/abort", {
              method: "POST",
              body: JSON.stringify({ key: state.key, uploadId: state.uploadId }),
            }).catch(() => {});
          }
        } else if (
          err instanceof Error &&
          /session not found|NoSuchUpload/i.test(err.message)
        ) {
          writePersistedResumeState(resumeStorageKey, null);
          onResumeStateChange?.(undefined);
        }
        throw err;
      }
    }

    const presign = await request<{
      direct: boolean;
      presignedUrl?: string;
      headers?: Record<string, string>;
      key?: string;
      url?: string;
      mimeType?: string;
    }>("/api/admin/uploads/presign", {
      method: "POST",
      signal,
      body: JSON.stringify({
        filename: file.name || "reel.mp4",
        mimeType,
        folder,
        size: file.size,
        replaceContentId,
      }),
    });

    if (presign.direct && presign.presignedUrl && presign.url) {
      await xhrPut({
        url: presign.presignedUrl,
        body: file,
        headers: presign.headers || { "Content-Type": presign.mimeType || mimeType },
        withCredentials: false,
        signal,
        onProgress: (loaded) => report(loaded, "uploading"),
      });
      onProgress?.({
        loadedBytes: file.size,
        totalBytes: file.size,
        remainingBytes: 0,
        percent: 100,
        phase: "finalizing",
      });
      return {
        url: presign.url,
        key: presign.key,
        mimeType: presign.mimeType || mimeType,
        size: file.size,
        success: true,
      };
    }

    const query = new URLSearchParams({
      mime: mimeType,
      filename: file.name || "reel.mp4",
      folder,
      ...(replaceContentId ? { replaceContentId: String(replaceContentId) } : {}),
    });

    return new Promise<{ url: string; mimeType: string; size: number; key?: string; success?: boolean }>(
      (resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Upload cancelled", "AbortError"));
          return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/api/admin/uploads?${query}`, true);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        const onAbort = () => {
          xhr.abort();
          reject(new DOMException("Upload cancelled", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        xhr.upload.onprogress = (evt) => report(evt.loaded, "uploading");
        xhr.onload = () => {
          signal?.removeEventListener("abort", onAbort);
          try {
            const parsed = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) {
              onProgress?.({
                loadedBytes: file.size,
                totalBytes: file.size,
                remainingBytes: 0,
                percent: 100,
                phase: "finalizing",
              });
              resolve(parsed);
              return;
            }
            reject(new ApiError(xhr.status, String(parsed?.error || `Upload failed (${xhr.status})`), parsed?.code, parsed));
          } catch {
            reject(new ApiError(xhr.status, `Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => {
          signal?.removeEventListener("abort", onAbort);
          reject(new Error("Network error occurred while uploading video."));
        };
        xhr.send(file);
      }
    );
  },
  upload: async (file: File, folder: string = "gallery") => {
    if (!file || file.size === 0) {
      throw new ApiError(400, "Choose a non-empty file to upload.");
    }

    const mimeType = detectMediaMimeType(file, folder);

    let directUploadReason = "";
    try {
      const presign = await request<{
        direct: boolean;
        presignedUrl?: string;
        headers?: Record<string, string>;
        key?: string;
        url?: string;
        mimeType?: string;
      }>("/api/admin/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name || "upload.bin",
          mimeType,
          folder: folder || "gallery",
          size: file.size,
        }),
      });

      if (presign.direct && presign.presignedUrl && presign.url) {
        const directRes = await fetch(presign.presignedUrl, {
          method: "PUT",
          body: file,
          headers: presign.headers || { "Content-Type": presign.mimeType || mimeType },
        });
        if (directRes.ok) {
          return {
            url: presign.url,
            mimeType: presign.mimeType || mimeType,
            size: file.size,
            key: presign.key,
            success: true,
          };
        }
        directUploadReason = `Direct cloud upload returned ${directRes.status}`;
      }
    } catch (error) {
      if (error instanceof ApiError && error.status !== 404 && error.status !== 405 && error.status < 500) {
        throw error;
      }
      directUploadReason = error instanceof Error ? error.message : "Direct cloud upload unavailable";
    }

    const query = new URLSearchParams({
      mime: mimeType,
      filename: file.name || "upload.bin",
      folder: folder || "gallery",
    });
    try {
      return await request<{ url: string; mimeType: string; size: number; key?: string; success?: boolean }>(`/api/admin/uploads?${query}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": "application/octet-stream" },
      });
    } catch (fallbackError) {
      if (directUploadReason && fallbackError instanceof ApiError && fallbackError.status === 413) {
        throw new ApiError(413, `Video is too large for proxy upload (${directUploadReason}).`);
      }
      throw fallbackError;
    }
  },
};

export const statusTone: Record<
  BookingStatus,
  "default" | "success" | "info" | "warning" | "danger" | "purple"
> = {
  pending: "warning",
  confirmed: "success",
  checked_in: "info",
  completed: "default",
  cancelled: "danger",
  no_show: "danger",
};
