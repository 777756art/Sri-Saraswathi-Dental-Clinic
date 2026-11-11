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

export const SITE_CONTENT_TYPES = ["hero", "blog", "offer", "gallery", "reel", "video", "image", "badge", "treatment", "doctor", "achievement", "testimonial", "before_after"] as const;
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
  createdAt: string;
  updatedAt: string;
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

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
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
  } catch {
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
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export function resolveApiAsset(url: string) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith("/api/") ? API_BASE_URL + value : value;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async (file: File, folder: string = "gallery") => {
    if (!file || file.size === 0) {
      throw new ApiError(400, "Choose a non-empty file to upload.");
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

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const rawMime = (file.type || "").toLowerCase().split(";")[0].trim();
    const mimeType =
      !rawMime || rawMime === "application/octet-stream" || rawMime === "binary/octet-stream"
        ? EXT_MIME[ext] || (folder === "reels" ? "video/mp4" : "image/jpeg")
        : rawMime;

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
