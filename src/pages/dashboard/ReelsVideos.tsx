"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  GripVertical,
  HardDrive,
  ImagePlus,
  Loader2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import {
  ApiError,
  api,
  resolveApiAsset,
  type ReelsSectionSettings,
  type ReelsStorageUsage,
  type ResumableResumeState,
  type ResumableUploadProgress,
  type SiteContent,
} from "@/lib/api";
import {
  DEFAULT_REELS_SECTION_SETTINGS,
  REEL_CATEGORIES,
  REELS_STORAGE_QUOTA_BYTES,
  captureVideoThumbnail,
  deriveTitleFromFilename,
  formatFileSizeMB,
  formatStorageBytes,
  isSupportedVideoFile,
  notifySiteContentUpdated,
} from "@/lib/reels";

interface UploadQueueItem {
  queueId: string;
  file: File;
  title: string;
  description: string;
  category: string;
  published: boolean;
  homepageHighlight: boolean;
  featured: boolean;
  displayOrder: number;
  thumbnailFile: File | null;
  thumbnailPreviewUrl: string;
  thumbnailSource: "auto" | "custom" | "none";
  status: "queued" | "uploading" | "completed" | "error" | "cancelled";
  progress: ResumableUploadProgress;
  errorMessage: string;
  resumeState?: ResumableResumeState;
}

const EMPTY_STORAGE: ReelsStorageUsage = {
  usedBytes: 0,
  quotaBytes: REELS_STORAGE_QUOTA_BYTES,
  availableBytes: REELS_STORAGE_QUOTA_BYTES,
  usedPercent: 0,
  videoCount: 0,
};

function formatDateLabel(raw: string): string {
  if (!raw) return "—";
  const dt = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(dt.getTime())) return raw.slice(0, 10);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReelsVideosPage() {
  const [reels, setReels] = useState<SiteContent[]>([]);
  const [storage, setStorage] = useState<ReelsStorageUsage>(EMPTY_STORAGE);
  const [settings, setSettings] = useState<ReelsSectionSettings>(DEFAULT_REELS_SECTION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "published" | "draft">("all");

  // Multi-file upload queue
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const uploadLockRef = useRef<Set<string>>(new Set());

  // Edit / Replace modal
  const [editingItem, setEditingItem] = useState<SiteContent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPublished, setEditPublished] = useState(true);
  const [editFeatured, setEditFeatured] = useState(false);
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editMediaUrl, setEditMediaUrl] = useState("");
  const [editFileSize, setEditFileSize] = useState(0);
  const [editMimeType, setEditMimeType] = useState("");
  const [replacingVideo, setReplacingVideo] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState<ResumableUploadProgress | null>(null);
  const [replaceResumeState, setReplaceResumeState] = useState<ResumableResumeState | undefined>(undefined);
  const [replacePendingFile, setReplacePendingFile] = useState<File | null>(null);
  const [replaceError, setReplaceError] = useState("");
  const [uploadingEditThumb, setUploadingEditThumb] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const replaceAbortRef = useRef<AbortController | null>(null);
  const newlyUploadedReplaceUrlsRef = useRef<string[]>([]);

  // Drag reorder, delete confirmation & preview modal
  const [draggedReelId, setDraggedReelId] = useState<number | null>(null);
  const [dragOverReelId, setDragOverReelId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SiteContent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewReel, setPreviewReel] = useState<SiteContent | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{
        items: SiteContent[];
        storage?: ReelsStorageUsage;
        reelsSettings?: ReelsSectionSettings;
      }>("/api/admin/content?type=reel");
      setReels(Array.isArray(data.items) ? data.items : []);
      if (data.storage) setStorage(data.storage);
      if (data.reelsSettings) setSettings(data.reelsSettings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load reels and storage data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const urls = previewUrlsRef.current;
    const controllers = activeAbortControllersRef.current;
    return () => {
      for (const ctrl of controllers.values()) {
        ctrl.abort();
      }
      for (const u of urls) {
        URL.revokeObjectURL(u);
      }
    };
  }, []);

  const refreshStorage = useCallback(async () => {
    try {
      const data = await api.get<{ storage: ReelsStorageUsage }>("/api/admin/reels/storage");
      if (data.storage) setStorage(data.storage);
    } catch {
      // Ignore background storage sync errors
    }
  }, []);

  const registerPreviewUrl = (url: string) => {
    if (url) previewUrlsRef.current.add(url);
    return url;
  };

  const releasePreviewUrl = (url: string) => {
    if (url && previewUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(url);
    }
  };

  const nextDefaultOrder = useMemo(() => {
    if (reels.length === 0) return 0;
    const maxOrder = reels.reduce((max, r) => Math.max(max, Number(r.displayOrder || 0)), 0);
    return maxOrder + 1;
  }, [reels]);

  const addFilesToQueue = async (files: FileList | File[]) => {
    const picked = Array.from(files || []);
    if (picked.length === 0) return;

    const queuedPendingBytes = queue
      .filter((q) => q.status === "queued" || q.status === "uploading" || q.status === "error" || q.status === "cancelled")
      .reduce((acc, q) => acc + q.file.size, 0);

    let runningProjected = storage.usedBytes + queuedPendingBytes;
    const additions: UploadQueueItem[] = [];
    let rejectedCount = 0;

    for (let i = 0; i < picked.length; i += 1) {
      const file = picked[i];
      if (!isSupportedVideoFile(file)) {
        rejectedCount += 1;
        toast.error(`"${file.name}" is not a supported format. Allowed: MP4, MOV, WebM.`);
        continue;
      }
      if (file.size <= 0) {
        rejectedCount += 1;
        toast.error(`"${file.name}" is empty.`);
        continue;
      }
      if (runningProjected + file.size > storage.quotaBytes) {
        rejectedCount += 1;
        const remaining = Math.max(0, storage.quotaBytes - runningProjected);
        toast.error(
          remaining <= 0
            ? `Storage quota full (2 GB limit). Delete existing videos before uploading "${file.name}".`
            : `"${file.name}" (${formatStorageBytes(file.size)}) exceeds remaining quota (${formatStorageBytes(remaining)} available).`
        );
        continue;
      }

      runningProjected += file.size;
      const qId = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
      additions.push({
        queueId: qId,
        file,
        title: deriveTitleFromFilename(file.name),
        description: "",
        category: "",
        published: true,
        homepageHighlight: true,
        featured: false,
        displayOrder: nextDefaultOrder + queue.length + additions.length,
        thumbnailFile: null,
        thumbnailPreviewUrl: "",
        thumbnailSource: "none",
        status: "queued",
        progress: {
          loadedBytes: 0,
          totalBytes: file.size,
          remainingBytes: file.size,
          percent: 0,
          phase: "preparing",
        },
        errorMessage: "",
      });
    }

    if (additions.length === 0) return;

    setQueue((prev) => [...prev, ...additions]);

    if (rejectedCount === 0 && additions.length > 0) {
      toast.success(`${additions.length} video${additions.length > 1 ? "s" : ""} ready to upload.`);
    }

    // Generate lightweight poster thumbnails in background without freezing UI
    for (const item of additions) {
      void captureVideoThumbnail(item.file).then((thumbFile) => {
        if (!thumbFile) return;
        const objectUrl = registerPreviewUrl(URL.createObjectURL(thumbFile));
        setQueue((prev) =>
          prev.map((q) => {
            if (q.queueId !== item.queueId || q.thumbnailSource === "custom") return q;
            if (q.thumbnailPreviewUrl) releasePreviewUrl(q.thumbnailPreviewUrl);
            return {
              ...q,
              thumbnailFile: thumbFile,
              thumbnailPreviewUrl: objectUrl,
              thumbnailSource: "auto",
            };
          })
        );
      });
    }
  };

  const updateQueueItem = (queueId: string, patch: Partial<UploadQueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.queueId === queueId ? { ...q, ...patch } : q)));
  };

  const removeQueueItem = (queueId: string) => {
    const controller = activeAbortControllersRef.current.get(queueId);
    if (controller) {
      controller.abort();
      activeAbortControllersRef.current.delete(queueId);
    }
    uploadLockRef.current.delete(queueId);
    const targetItem = queue.find((q) => q.queueId === queueId);
    if (targetItem?.resumeState?.uploadId && targetItem?.resumeState?.key) {
      void api.abortMultipartUpload(targetItem.resumeState.key, targetItem.resumeState.uploadId);
    }
    setQueue((prev) => {
      const target = prev.find((q) => q.queueId === queueId);
      if (target?.thumbnailPreviewUrl) releasePreviewUrl(target.thumbnailPreviewUrl);
      return prev.filter((q) => q.queueId !== queueId);
    });
  };

  const uploadSingleQueueItem = async (itemSnapshot: UploadQueueItem): Promise<boolean> => {
    const qId = itemSnapshot.queueId;
    if (uploadLockRef.current.has(qId)) return false;
    uploadLockRef.current.add(qId);

    const controller = new AbortController();
    activeAbortControllersRef.current.set(qId, controller);

    updateQueueItem(qId, {
      status: "uploading",
      errorMessage: "",
      progress: {
        loadedBytes: itemSnapshot.progress.loadedBytes || 0,
        totalBytes: itemSnapshot.file.size,
        remainingBytes: itemSnapshot.file.size - (itemSnapshot.progress.loadedBytes || 0),
        percent: itemSnapshot.progress.percent || 0,
        phase: "preparing",
      },
    });

    try {
      // 1. Optional thumbnail uploaded to gallery folder so thumbnails never count against 2GB video quota
      let thumbnailUrl = "";
      if (itemSnapshot.thumbnailFile) {
        try {
          const thumbRes = await api.upload(itemSnapshot.thumbnailFile, "gallery");
          thumbnailUrl = thumbRes.url;
        } catch {
          // Proceed even if auto thumbnail upload fails; video itself still works cleanly
        }
      }

      // 2. Direct / chunked resumable video upload to R2
      const uploaded = await api.uploadVideoResumable(itemSnapshot.file, {
        folder: "reels",
        signal: controller.signal,
        resumeState: itemSnapshot.resumeState,
        onResumeStateChange: (nextResume) => {
          updateQueueItem(qId, { resumeState: nextResume });
        },
        onProgress: (progress) => {
          updateQueueItem(qId, { progress });
        },
      });

      // 3. Persist Reel entry + authoritative fileSize & mimeType in D1
      const saved = await api.post<{ item: SiteContent; storage?: ReelsStorageUsage }>("/api/admin/content", {
        type: "reel",
        title: itemSnapshot.title.trim() || deriveTitleFromFilename(itemSnapshot.file.name),
        excerpt: itemSnapshot.description.trim(),
        category: itemSnapshot.category.trim(),
        mediaUrl: uploaded.url,
        mobileMediaUrl: thumbnailUrl,
        badgeText: itemSnapshot.featured ? "Featured" : "",
        homepageHighlight: itemSnapshot.published,
        published: itemSnapshot.published,
        displayOrder: Number(itemSnapshot.displayOrder || 0),
        fileSize: uploaded.size || itemSnapshot.file.size,
        mimeType: uploaded.mimeType || itemSnapshot.file.type || "video/mp4",
      });

      setReels((prev) => {
        const merged = [saved.item, ...prev.filter((r) => r.id !== saved.item.id)];
        return merged.sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id);
      });
      if (saved.storage) {
        setStorage(saved.storage);
      } else {
        await refreshStorage();
      }
      notifySiteContentUpdated();

      updateQueueItem(qId, {
        status: "completed",
        progress: {
          loadedBytes: itemSnapshot.file.size,
          totalBytes: itemSnapshot.file.size,
          remainingBytes: 0,
          percent: 100,
          phase: "finalizing",
        },
      });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        updateQueueItem(qId, {
          status: "cancelled",
          errorMessage: "Upload paused. Click Resume to continue.",
        });
        return false;
      }

      if (err instanceof ApiError && err.code === "STORAGE_QUOTA_EXCEEDED") {
        const storagePayload = (err.data as { storage?: ReelsStorageUsage } | undefined)?.storage;
        if (storagePayload) setStorage(storagePayload);
      }

      const msg = err instanceof Error ? err.message : "Upload failed.";
      updateQueueItem(qId, {
        status: "error",
        errorMessage: msg,
      });
      toast.error(msg);
      return false;
    } finally {
      activeAbortControllersRef.current.delete(qId);
      uploadLockRef.current.delete(qId);
    }
  };

  const handleUploadAll = async () => {
    if (uploadingBatch) return;
    const candidates = queue.filter((q) => q.status === "queued" || q.status === "error" || q.status === "cancelled");
    if (candidates.length === 0) return;

    setUploadingBatch(true);
    let okCount = 0;
    try {
      for (const candidate of candidates) {
        const latest = queue.find((q) => q.queueId === candidate.queueId) || candidate;
        const ok = await uploadSingleQueueItem(latest);
        if (ok) okCount += 1;
      }
      if (okCount > 0) {
        toast.success(`${okCount} video${okCount > 1 ? "s" : ""} uploaded and saved.`);
      }
    } finally {
      setUploadingBatch(false);
    }
  };

  const handleCancelUpload = (queueId: string) => {
    const controller = activeAbortControllersRef.current.get(queueId);
    if (controller) {
      controller.abort();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      const res = await api.patch<{ settings: ReelsSectionSettings }>("/api/admin/reels/settings", {
        enabled: settings.enabled,
        heading: settings.heading.trim() || DEFAULT_REELS_SECTION_SETTINGS.heading,
        subtitle: settings.subtitle.trim() || DEFAULT_REELS_SECTION_SETTINGS.subtitle,
      });
      setSettings(res.settings);
      notifySiteContentUpdated();
      toast.success("Reels section settings updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save section settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleQuickField = async (
    item: SiteContent,
    patch: { published?: boolean; featured?: boolean }
  ) => {
    const payload: { published?: boolean; homepageHighlight?: boolean; featured?: boolean } = {
      ...patch,
      ...(typeof patch.published === "boolean" ? { homepageHighlight: patch.published } : {}),
    };
    try {
      const res = await api.patch<{ item: SiteContent; storage?: ReelsStorageUsage }>(
        `/api/admin/content/${item.id}`,
        payload
      );
      setReels((prev) => prev.map((r) => (r.id === item.id ? res.item : r)));
      if (res.storage) setStorage(res.storage);
      notifySiteContentUpdated();
      toast.success("Video display settings updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update video.");
    }
  };

  const commitOrder = async (reordered: SiteContent[]) => {
    const optimistic = reordered.map((r, idx) => ({ ...r, displayOrder: idx }));
    setReels(optimistic);

    try {
      const res = await api.patch<{ ok: boolean; items: SiteContent[] }>("/api/admin/reels/reorder", {
        orderedIds: optimistic.map((r) => r.id),
      });
      if (Array.isArray(res.items)) {
        setReels(res.items);
      }
      notifySiteContentUpdated();
      toast.success("Display order updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder videos.");
      await loadData();
    }
  };

  const handleReorderMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= reels.length) return;
    const reordered = [...reels];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await commitOrder(reordered);
  };

  const handleRowDrop = async (targetId: number) => {
    const sourceId = draggedReelId;
    setDraggedReelId(null);
    setDragOverReelId(null);
    if (!sourceId || sourceId === targetId) return;
    const fromIndex = reels.findIndex((r) => r.id === sourceId);
    const toIndex = reels.findIndex((r) => r.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const reordered = [...reels];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await commitOrder(reordered);
  };

  const openEditModal = (item: SiteContent) => {
    newlyUploadedReplaceUrlsRef.current = [];
    setEditingItem(item);
    setEditTitle(item.title || "");
    setEditDescription(item.excerpt || item.subtitle || "");
    setEditCategory(item.category || "");
    setEditPublished(Boolean(item.published));
    setEditFeatured(Boolean(item.featured || String(item.badgeText || "").toLowerCase() === "featured"));
    setEditDisplayOrder(Number(item.displayOrder || 0));
    setEditThumbnailUrl(item.mobileMediaUrl || "");
    setEditMediaUrl(item.mediaUrl || "");
    setEditFileSize(Number(item.fileSize || 0));
    setEditMimeType(item.mimeType || "");
    setReplacingVideo(false);
    setReplaceProgress(null);
    setReplaceResumeState(undefined);
    setReplacePendingFile(null);
    setReplaceError("");
  };

  const closeEditModal = () => {
    replaceAbortRef.current?.abort();
    replaceAbortRef.current = null;
    if (replaceResumeState?.key && replaceResumeState?.uploadId) {
      void api.abortMultipartUpload(replaceResumeState.key, replaceResumeState.uploadId);
    }
    if (newlyUploadedReplaceUrlsRef.current.length > 0) {
      void api.cleanupUnreferencedMedia(newlyUploadedReplaceUrlsRef.current);
      newlyUploadedReplaceUrlsRef.current = [];
    }
    setEditingItem(null);
  };

  const runReplaceVideoUpload = async (file: File, resume?: ResumableResumeState) => {
    if (!editingItem || replacingVideo) return;
    if (!isSupportedVideoFile(file)) {
      toast.error("Supported formats: MP4, MOV, WebM.");
      return;
    }

    const effectiveAvailable = storage.availableBytes + Number(editingItem.fileSize || 0);
    if (file.size > effectiveAvailable) {
      const msg = `Replacement video (${formatStorageBytes(file.size)}) exceeds remaining storage quota (${formatStorageBytes(effectiveAvailable)} available).`;
      setReplaceError(msg);
      toast.error(msg);
      return;
    }

    setReplacePendingFile(file);
    setReplaceError("");
    setReplacingVideo(true);
    const ctrl = new AbortController();
    replaceAbortRef.current = ctrl;

    try {
      const uploaded = await api.uploadVideoResumable(file, {
        folder: "reels",
        replaceContentId: editingItem.id,
        signal: ctrl.signal,
        resumeState: resume,
        onResumeStateChange: (next) => setReplaceResumeState(next),
        onProgress: (p) => setReplaceProgress(p),
      });

      newlyUploadedReplaceUrlsRef.current.push(uploaded.url);
      setEditMediaUrl(uploaded.url);
      setEditFileSize(uploaded.size || file.size);
      setEditMimeType(uploaded.mimeType || file.type || "video/mp4");
      setReplacePendingFile(null);
      setReplaceResumeState(undefined);
      toast.success("Replacement video uploaded. Click Save Changes to apply.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setReplaceError("Replacement upload paused. Click Resume to continue.");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to upload replacement video.";
        setReplaceError(msg);
        toast.error(msg);
      }
    } finally {
      setReplacingVideo(false);
      replaceAbortRef.current = null;
    }
  };

  const handleUploadEditThumbnail = async (file: File) => {
    setUploadingEditThumb(true);
    try {
      const uploaded = await api.upload(file, "gallery");
      newlyUploadedReplaceUrlsRef.current.push(uploaded.url);
      setEditThumbnailUrl(uploaded.url);
      toast.success("Thumbnail updated. Save changes to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload thumbnail.");
    } finally {
      setUploadingEditThumb(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || savingEdit || replacingVideo) return;
    if (!editTitle.trim()) {
      toast.error("Please enter a video title.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.patch<{ item: SiteContent; storage?: ReelsStorageUsage }>(
        `/api/admin/content/${editingItem.id}`,
        {
          title: editTitle.trim(),
          excerpt: editDescription.trim(),
          category: editCategory.trim(),
          published: editPublished,
          homepageHighlight: editPublished,
          featured: editFeatured,
          badgeText: editFeatured ? "Featured" : "",
          displayOrder: Number(editDisplayOrder || 0),
          mobileMediaUrl: editThumbnailUrl,
          mediaUrl: editMediaUrl,
          fileSize: editFileSize,
          mimeType: editMimeType,
        }
      );

      newlyUploadedReplaceUrlsRef.current = [];
      setReels((prev) =>
        prev
          .map((r) => (r.id === editingItem.id ? res.item : r))
          .sort((a, b) => a.displayOrder - b.displayOrder || b.id - a.id)
      );
      if (res.storage) setStorage(res.storage);
      setEditingItem(null);
      notifySiteContentUpdated();
      toast.success("Video changes saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save video changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await api.delete<{ ok: boolean; id: number; storage?: ReelsStorageUsage }>(
        `/api/admin/content/${deleteTarget.id}`
      );
      setReels((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (res.storage) {
        setStorage(res.storage);
      } else {
        await refreshStorage();
      }
      setDeleteTarget(null);
      notifySiteContentUpdated();
      toast.success("Video permanently deleted and storage reclaimed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete video.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredReels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reels.filter((item) => {
      if (visibilityFilter === "published" && !item.published) return false;
      if (visibilityFilter === "draft" && item.published) return false;
      if (categoryFilter === "__none__" && item.category) return false;
      if (categoryFilter !== "all" && categoryFilter !== "__none__" && item.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.excerpt || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q)
      );
    });
  }, [reels, searchQuery, categoryFilter, visibilityFilter]);

  const storageVariant =
    storage.usedPercent >= 90 ? "danger" : storage.usedPercent >= 75 ? "warning" : "default";
  const isStorageFull = storage.availableBytes <= 0;
  const pendingUploadCount = queue.filter((q) => q.status === "queued" || q.status === "error" || q.status === "cancelled").length;
  const canDragReorder = !searchQuery.trim() && categoryFilter === "all" && visibilityFilter === "all" && reels.length > 1;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1380px] space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E4F0F2] text-[#1F6878]">
                <Video className="h-4.5 w-4.5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#15191B]">
                Reels Management
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#707574]">
              Upload portrait clinic reels, organize categories, manage display order, and monitor your dedicated 2 GB video storage quota.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/#reels"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1F6878]/25 bg-white px-4 py-2 text-xs font-semibold text-[#1F6878] transition hover:bg-[#E4F0F2]"
            >
              View Live Section <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-[#15191B] transition hover:bg-secondary-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Row 1: 2GB Storage Quota + Section Display Controls */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* 2GB Dedicated Video Storage Indicator */}
          <div
            data-testid="reels-storage-card"
            className="rounded-2xl border border-[#dce4e5] bg-white p-6 shadow-sm lg:col-span-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878]">
                  <HardDrive className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#15191B]">Video Storage</h2>
                  <p className="text-xs text-[#707574]">
                    Dedicated quota for Reels &amp; Videos ({storage.videoCount} video{storage.videoCount === 1 ? "" : "s"})
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#F5F2EB] px-3 py-1 text-xs font-bold text-[#1F6878]">
                {storage.usedPercent}% Used
              </span>
            </div>

            <div className="mt-5">
              <Progress value={storage.usedBytes} max={storage.quotaBytes} variant={storageVariant} size="md" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-[#F5F2EB]/70 p-3.5 text-center">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#707574]">Used</p>
                <p data-testid="storage-used-label" className="mt-0.5 text-sm font-bold text-[#15191B]">
                  {formatStorageBytes(storage.usedBytes)}
                </p>
              </div>
              <div className="border-x border-[#dce4e5]">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#707574]">Available</p>
                <p data-testid="storage-available-label" className="mt-0.5 text-sm font-bold text-[#1F6878]">
                  {formatStorageBytes(storage.availableBytes)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#707574]">Total Capacity</p>
                <p className="mt-0.5 text-sm font-bold text-[#15191B]">2 GB</p>
              </div>
            </div>

            {isStorageFull ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
                <span>
                  Video storage is full (2 GB limit reached). Delete existing videos below to free space before uploading.
                </span>
              </div>
            ) : storage.usedPercent >= 85 ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
                <span>
                  Storage is nearly full. Only {formatStorageBytes(storage.availableBytes)} remaining.
                </span>
              </div>
            ) : (
              <p className="mt-3 text-[11.5px] text-[#707574]">
                Custom &amp; auto-generated thumbnails are stored separately and do not consume your 2 GB video limit.
              </p>
            )}
          </div>

          {/* Section Display Controls */}
          <form
            onSubmit={handleSaveSettings}
            className="rounded-2xl border border-[#dce4e5] bg-white p-6 shadow-sm lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#15191B]">Homepage Section Display Controls</h2>
                <p className="text-xs text-[#707574]">
                  Control homepage visibility, heading, and subtitle without editing code.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-[#dce4e5] bg-[#F5F2EB]/60 px-3.5 py-1.5 text-xs font-semibold text-[#15191B]">
                <input
                  type="checkbox"
                  data-testid="section-enabled-toggle"
                  checked={settings.enabled}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded accent-[#1F6878]"
                />
                <span>{settings.enabled ? "Section Enabled" : "Section Hidden"}</span>
              </label>
            </div>

            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#15191B]">
                  Section Heading
                </label>
                <input
                  type="text"
                  data-testid="section-heading-input"
                  value={settings.heading}
                  onChange={(e) => setSettings((prev) => ({ ...prev, heading: e.target.value }))}
                  placeholder="Trending Reels & Videos"
                  className="w-full rounded-xl border border-[#dce4e5] bg-white px-3.5 py-2 text-sm text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#15191B]">
                  Section Subtitle
                </label>
                <textarea
                  rows={2}
                  data-testid="section-subtitle-input"
                  value={settings.subtitle}
                  onChange={(e) => setSettings((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Watch real patient experiences, dental care videos, clinic moments and educational content."
                  className="w-full rounded-xl border border-[#dce4e5] bg-white px-3.5 py-2 text-sm text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="submit"
                data-testid="save-section-settings-btn"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1F6878] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#17515e] disabled:opacity-60"
              >
                {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Section Controls
              </button>
            </div>
          </form>
        </div>

        {/* Row 2: Premium Drag & Drop Upload Interface */}
        <div className="rounded-2xl border border-[#dce4e5] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#15191B]">Upload New Reels &amp; Videos</h2>
              <p className="text-xs text-[#707574]">
                Drag &amp; drop or select multiple MP4, MOV, or WebM videos. Large files upload in parallel/resumable chunks directly to cloud storage without freezing your browser.
              </p>
            </div>
            {pendingUploadCount > 0 && (
              <button
                type="button"
                data-testid="start-upload-btn"
                disabled={uploadingBatch || isStorageFull}
                onClick={() => void handleUploadAll()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E95A35] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#d14824] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {uploadingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingBatch
                  ? "Uploading..."
                  : `Upload ${pendingUploadCount} Video${pendingUploadCount > 1 ? "s" : ""}`}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            data-testid="video-file-input"
            type="file"
            multiple
            accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                void addFilesToQueue(e.target.files);
                e.target.value = "";
              }
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files?.length) {
                void addFilesToQueue(e.dataTransfer.files);
              }
            }}
            className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
              isDraggingOver
                ? "border-[#E95A35] bg-[#E95A35]/5"
                : "border-[#1F6878]/30 bg-[#F5F2EB]/45 hover:border-[#1F6878]/60"
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E4F0F2] text-[#1F6878]">
              <Film className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-[#15191B]">
              Drop portrait videos here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-bold text-[#E95A35] underline decoration-[#E95A35]/40 underline-offset-4 hover:text-[#c94725]"
              >
                browse files
              </button>
            </p>
            <p className="mt-1 text-xs text-[#707574]">
              Supported formats: MP4, MOV, WebM &bull; Portrait 9:16 recommended &bull; Multiple files supported
            </p>
          </div>

          {/* Upload Queue */}
          {queue.length > 0 && (
            <div className="mt-6 space-y-4">
              {queue.map((item) => {
                const isBusy = item.status === "uploading";
                const isDone = item.status === "completed";
                return (
                  <div
                    key={item.queueId}
                    data-testid="upload-queue-item"
                    className="rounded-2xl border border-[#dce4e5] bg-[#F5F2EB]/30 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      {/* Poster preview + custom thumbnail upload */}
                      <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-start">
                        <div className="relative h-28 w-16 overflow-hidden rounded-xl border border-[#dce4e5] bg-[#15191B]">
                          {item.thumbnailPreviewUrl ? (
                            <img
                              src={item.thumbnailPreviewUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-white/50">
                              <Video className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        {!isDone && !isBusy && (
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#dce4e5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1F6878] hover:bg-[#E4F0F2]">
                            <ImagePlus className="h-3.5 w-3.5" />
                            <span>{item.thumbnailFile ? "Change Thumb" : "Add Thumb"}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              className="hidden"
                              onChange={(e) => {
                                const thumb = e.target.files?.[0];
                                if (!thumb) return;
                                if (item.thumbnailPreviewUrl) releasePreviewUrl(item.thumbnailPreviewUrl);
                                updateQueueItem(item.queueId, {
                                  thumbnailFile: thumb,
                                  thumbnailPreviewUrl: registerPreviewUrl(URL.createObjectURL(thumb)),
                                  thumbnailSource: "custom",
                                });
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Metadata inputs */}
                      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-semibold text-[#15191B]">
                            Video Title
                          </label>
                          <input
                            type="text"
                            disabled={isBusy || isDone}
                            value={item.title}
                            onChange={(e) => updateQueueItem(item.queueId, { title: e.target.value })}
                            className="w-full rounded-lg border border-[#dce4e5] bg-white px-3 py-1.5 text-sm text-[#15191B] disabled:bg-secondary-50"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#15191B]">
                            Category (Optional)
                          </label>
                          <select
                            disabled={isBusy || isDone}
                            value={item.category}
                            onChange={(e) => updateQueueItem(item.queueId, { category: e.target.value })}
                            className="w-full rounded-lg border border-[#dce4e5] bg-white px-2.5 py-1.5 text-sm text-[#15191B] disabled:bg-secondary-50"
                          >
                            <option value="">No Category</option>
                            {REEL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-[#15191B]">
                            Display Order
                          </label>
                          <input
                            type="number"
                            disabled={isBusy || isDone}
                            value={item.displayOrder}
                            onChange={(e) =>
                              updateQueueItem(item.queueId, { displayOrder: Number(e.target.value || 0) })
                            }
                            className="w-full rounded-lg border border-[#dce4e5] bg-white px-3 py-1.5 text-sm text-[#15191B] disabled:bg-secondary-50"
                          />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-2">
                          <label className="mb-1 block text-[11px] font-semibold text-[#15191B]">
                            Description (Optional)
                          </label>
                          <input
                            type="text"
                            disabled={isBusy || isDone}
                            value={item.description}
                            placeholder="Short description shown on the video card"
                            onChange={(e) => updateQueueItem(item.queueId, { description: e.target.value })}
                            className="w-full rounded-lg border border-[#dce4e5] bg-white px-3 py-1.5 text-sm text-[#15191B] disabled:bg-secondary-50"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:pt-5">
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15191B]">
                            <input
                              type="checkbox"
                              disabled={isBusy || isDone}
                              checked={item.published}
                              onChange={(e) => updateQueueItem(item.queueId, { published: e.target.checked })}
                              className="h-4 w-4 rounded accent-[#1F6878]"
                            />
                            Publish now
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15191B]">
                            <input
                              type="checkbox"
                              disabled={isBusy || isDone}
                              checked={item.featured}
                              onChange={(e) => updateQueueItem(item.queueId, { featured: e.target.checked })}
                              className="h-4 w-4 rounded accent-[#E95A35]"
                            />
                            Featured
                          </label>
                        </div>
                      </div>

                      {/* Actions column */}
                      <div className="flex shrink-0 items-center gap-2 self-end lg:self-start">
                        {isBusy ? (
                          <button
                            type="button"
                            data-testid="cancel-upload-btn"
                            onClick={() => handleCancelUpload(item.queueId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                          >
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </button>
                        ) : (
                          <>
                            {(item.status === "error" || item.status === "cancelled") && (
                              <button
                                type="button"
                                data-testid="retry-upload-btn"
                                onClick={() => void uploadSingleQueueItem(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#E95A35] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d14824]"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />{" "}
                                {item.status === "cancelled" || item.resumeState ? "Resume" : "Retry"}
                              </button>
                            )}
                            {item.status === "queued" && (
                              <button
                                type="button"
                                disabled={uploadingBatch}
                                onClick={() => void uploadSingleQueueItem(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#1F6878] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#17515e] disabled:opacity-50"
                              >
                                <Upload className="h-3.5 w-3.5" /> Upload
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeQueueItem(item.queueId)}
                              aria-label="Remove from queue"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce4e5] bg-white text-[#707574] hover:bg-danger-50 hover:text-danger-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detailed Progress Readout */}
                    <div className="mt-3 border-t border-[#dce4e5]/70 pt-3">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#15191B]">
                          {item.file.name} &bull;{" "}
                          <span className="text-[#707574]">
                            {formatFileSizeMB(item.progress.loadedBytes)} / {formatFileSizeMB(item.progress.totalBytes)}
                          </span>
                          {isBusy && (
                            <span className="ml-2 text-[#1F6878]">
                              ({formatFileSizeMB(item.progress.remainingBytes)} remaining)
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-[#1F6878]">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[#19B987]">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded (100%)
                            </span>
                          ) : item.status === "uploading" ? (
                            `${item.progress.percent}% (${item.progress.phase === "finalizing" ? "Finalizing..." : "Uploading"})`
                          ) : item.status === "error" ? (
                            <span className="text-danger-600">{item.errorMessage || "Failed"}</span>
                          ) : item.status === "cancelled" ? (
                            <span className="text-warning-700">{item.errorMessage || "Cancelled"}</span>
                          ) : (
                            "Ready"
                          )}
                        </span>
                      </div>
                      <Progress
                        value={item.progress.percent}
                        max={100}
                        variant={
                          item.status === "error"
                            ? "danger"
                            : item.status === "completed"
                              ? "success"
                              : item.status === "cancelled"
                                ? "warning"
                                : "default"
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 3: Video Management Table with Search & Filters */}
        <div className="rounded-2xl border border-[#dce4e5] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#15191B]">
                All Uploaded Videos ({filteredReels.length})
              </h2>
              <p className="text-xs text-[#707574]">
                Manage thumbnails, categories, homepage visibility, featured badges, ordering, or permanently delete videos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#707574]" />
                <input
                  type="text"
                  data-testid="reels-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-48 rounded-xl border border-[#dce4e5] bg-white py-1.5 pl-8 pr-3 text-xs text-[#15191B] focus:border-[#1F6878] focus:outline-none sm:w-56"
                />
              </div>

              <select
                data-testid="reels-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-[#dce4e5] bg-white px-3 py-1.5 text-xs font-medium text-[#15191B] focus:border-[#1F6878] focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="__none__">No Category Assigned</option>
                {REEL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                data-testid="reels-visibility-filter"
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as "all" | "published" | "draft")}
                className="rounded-xl border border-[#dce4e5] bg-white px-3 py-1.5 text-xs font-medium text-[#15191B] focus:border-[#1F6878] focus:outline-none"
              >
                <option value="all">All Visibility</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-14 text-sm text-[#707574]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#1F6878]" /> Loading reels...
              </div>
            ) : filteredReels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dce4e5] bg-[#F5F2EB]/40 py-14 text-center text-sm text-[#707574]">
                {reels.length === 0
                  ? "No videos uploaded yet. Drop portrait videos in the uploader above."
                  : "No videos match the current search or filter criteria."}
              </div>
            ) : (
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce4e5] bg-[#F5F2EB]/65 text-[11px] font-bold uppercase tracking-wider text-[#707574]">
                    <th className="rounded-tl-xl px-3 py-3">Thumbnail</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">File Size</th>
                    <th className="px-3 py-3">Visibility</th>
                    <th className="px-3 py-3">Order</th>
                    <th className="px-3 py-3">Uploaded Date</th>
                    <th className="rounded-tr-xl px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce4e5]/70">
                  {filteredReels.map((item) => {
                    const realIndex = reels.findIndex((r) => r.id === item.id);
                    const thumbSrc = item.mobileMediaUrl ? resolveApiAsset(item.mobileMediaUrl) : "";
                    const vidSrc = item.mediaUrl ? resolveApiAsset(item.mediaUrl) : "";
                    const isFeatured = Boolean(
                      item.featured || String(item.badgeText || "").trim().toLowerCase() === "featured"
                    );

                    return (
                      <tr
                        key={item.id}
                        data-testid={`reel-row-${item.id}`}
                        draggable={canDragReorder}
                        onDragStart={() => setDraggedReelId(item.id)}
                        onDragOver={(e) => {
                          if (!canDragReorder || !draggedReelId || draggedReelId === item.id) return;
                          e.preventDefault();
                          if (dragOverReelId !== item.id) setDragOverReelId(item.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverReelId === item.id) setDragOverReelId(null);
                        }}
                        onDrop={(e) => {
                          if (!canDragReorder) return;
                          e.preventDefault();
                          void handleRowDrop(item.id);
                        }}
                        onDragEnd={() => {
                          setDraggedReelId(null);
                          setDragOverReelId(null);
                        }}
                        className={`transition-colors hover:bg-[#E4F0F2]/20 ${
                          dragOverReelId === item.id ? "bg-[#E4F0F2]/60 ring-1 ring-inset ring-[#1F6878]" : ""
                        } ${draggedReelId === item.id ? "opacity-50" : ""}`}
                      >
                        {/* Thumbnail */}
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setPreviewReel(item)}
                            aria-label={`Preview ${item.title}`}
                            className="group relative h-20 w-12 overflow-hidden rounded-lg border border-[#dce4e5] bg-[#15191B]"
                          >
                            {thumbSrc ? (
                              <img src={thumbSrc} alt={item.title} className="h-full w-full object-cover" />
                            ) : vidSrc ? (
                              <video
                                src={`${vidSrc}#t=0.1`}
                                muted
                                playsInline
                                preload="metadata"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                            <span className="absolute inset-0 grid place-items-center bg-black/30 text-white opacity-90 transition group-hover:bg-[#E95A35]/80">
                              <Play className="h-4 w-4 fill-current" />
                            </span>
                          </button>
                        </td>

                        {/* Title + quick flags */}
                        <td className="max-w-[270px] px-3 py-3">
                          <div className="font-semibold text-[#15191B]">{item.title || "Untitled Video"}</div>
                          {item.excerpt && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-[#707574]">{item.excerpt}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleToggleQuickField(item, { featured: !isFeatured })}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                                isFeatured
                                  ? "bg-[#E95A35] text-white"
                                  : "border border-[#dce4e5] bg-white text-[#707574] hover:text-[#E95A35]"
                              }`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {isFeatured ? "Featured" : "Set Featured"}
                            </button>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-3 py-3">
                          {item.category ? (
                            <span className="inline-flex rounded-full bg-[#E4F0F2] px-2.5 py-1 text-xs font-semibold text-[#1F6878]">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-xs text-[#707574]">Unassigned</span>
                          )}
                        </td>

                        {/* File Size */}
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-[#15191B]">
                          {Number(item.fileSize || 0) > 0 ? formatStorageBytes(Number(item.fileSize)) : "—"}
                        </td>

                        {/* Visibility */}
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            data-testid={`toggle-publish-${item.id}`}
                            onClick={() => void handleToggleQuickField(item, { published: !item.published })}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                              item.published
                                ? "bg-[#19B987]/15 text-[#0f7e5b] hover:bg-[#19B987]/25"
                                : "bg-secondary-100 text-[#707574] hover:bg-secondary-200"
                            }`}
                          >
                            {item.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            {item.published ? "Published" : "Draft"}
                          </button>
                        </td>

                        {/* Display Order */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {canDragReorder && (
                              <span
                                title="Drag row to reorder"
                                className="inline-flex cursor-grab items-center text-[#707574] active:cursor-grabbing"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <span className="w-6 text-center text-xs font-bold text-[#15191B]">
                              {item.displayOrder}
                            </span>
                            <button
                              type="button"
                              disabled={realIndex <= 0}
                              onClick={() => void handleReorderMove(realIndex, -1)}
                              aria-label="Move video earlier"
                              className="grid h-6 w-6 place-items-center rounded border border-[#dce4e5] bg-white text-[#1F6878] hover:bg-[#E4F0F2] disabled:opacity-35"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={realIndex < 0 || realIndex >= reels.length - 1}
                              onClick={() => void handleReorderMove(realIndex, 1)}
                              aria-label="Move video later"
                              className="grid h-6 w-6 place-items-center rounded border border-[#dce4e5] bg-white text-[#1F6878] hover:bg-[#E4F0F2] disabled:opacity-35"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Uploaded Date */}
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-[#707574]">
                          {formatDateLabel(item.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              data-testid={`edit-reel-${item.id}`}
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#1F6878]/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1F6878] hover:bg-[#E4F0F2]"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              data-testid={`delete-reel-${item.id}`}
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-danger-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-danger-600 hover:bg-danger-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit / Replace Video / Change Thumbnail Modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={closeEditModal}
        title="Edit Video & Media"
        description="Update video details, category, visibility, custom thumbnail, or replace the video file."
        size="lg"
      >
        {editingItem && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#15191B]">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#dce4e5] px-3.5 py-2 text-sm text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-[#15191B]">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#dce4e5] px-3.5 py-2 text-sm text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#15191B]">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#dce4e5] bg-white px-3 py-2 text-sm text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                >
                  <option value="">No Category</option>
                  {REEL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#15191B]">Display Order</label>
                <input
                  type="number"
                  value={editDisplayOrder}
                  onChange={(e) => setEditDisplayOrder(Number(e.target.value || 0))}
                  className="w-full rounded-xl border border-[#dce4e5] px-3.5 py-2 text-sm text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[#F5F2EB]/60 p-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#15191B]">
                <input
                  type="checkbox"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#1F6878]"
                />
                Published
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#15191B]">
                <input
                  type="checkbox"
                  checked={editFeatured}
                  onChange={(e) => setEditFeatured(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E95A35]"
                />
                Featured video
              </label>
            </div>

            {/* Thumbnail & Replace Video */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#dce4e5] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#15191B]">Thumbnail Poster</span>
                  {editThumbnailUrl && (
                    <button
                      type="button"
                      onClick={() => setEditThumbnailUrl("")}
                      className="text-[11px] font-semibold text-danger-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="h-20 w-12 shrink-0 overflow-hidden rounded-lg border border-[#dce4e5] bg-[#15191B]">
                    {editThumbnailUrl ? (
                      <img src={resolveApiAsset(editThumbnailUrl)} alt="Thumbnail" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-white/50">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#1F6878]/25 bg-white px-3 py-2 text-xs font-semibold text-[#1F6878] hover:bg-[#E4F0F2]">
                    {uploadingEditThumb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {editThumbnailUrl ? "Change Thumbnail" : "Upload Thumbnail"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="hidden"
                      disabled={uploadingEditThumb}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadEditThumbnail(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#dce4e5] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#15191B]">Video File</span>
                  <span className="text-[11px] font-semibold text-[#707574]">
                    {editFileSize > 0 ? formatStorageBytes(editFileSize) : "Size pending"}
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E95A35] px-3 py-2 text-xs font-bold text-white hover:bg-[#d14824]">
                      <Upload className="h-3.5 w-3.5" />
                      Replace Video
                      <input
                        type="file"
                        accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm"
                        className="hidden"
                        disabled={replacingVideo}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void runReplaceVideoUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {replacingVideo && (
                      <button
                        type="button"
                        onClick={() => replaceAbortRef.current?.abort()}
                        className="rounded-lg border border-amber-300 bg-amber-50/70 px-2.5 py-1.5 text-xs font-bold text-amber-800"
                      >
                        Pause
                      </button>
                    )}
                    {!replacingVideo && replacePendingFile && (
                      <button
                        type="button"
                        onClick={() => void runReplaceVideoUpload(replacePendingFile, replaceResumeState)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1F6878] px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        <RotateCcw className="h-3 w-3" /> {replaceResumeState ? "Resume" : "Retry"}
                      </button>
                    )}
                  </div>
                  {replaceProgress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-[#707574]">
                        <span>
                          {formatFileSizeMB(replaceProgress.loadedBytes)} / {formatFileSizeMB(replaceProgress.totalBytes)}
                        </span>
                        <span>{replaceProgress.percent}%</span>
                      </div>
                      <Progress value={replaceProgress.percent} size="sm" />
                    </div>
                  )}
                  {replaceError && <p className="text-[11px] font-medium text-danger-600">{replaceError}</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-[#dce4e5] pt-4">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl border border-[#dce4e5] bg-white px-4 py-2 text-xs font-semibold text-[#15191B] hover:bg-secondary-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit || replacingVideo || uploadingEditThumb}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1F6878] px-5 py-2 text-xs font-bold text-white hover:bg-[#17515e] disabled:opacity-55"
              >
                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Permanently Delete Video?"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#707574]">
              Are you sure you want to permanently delete{" "}
              <strong className="text-[#15191B]">&ldquo;{deleteTarget.title || "Untitled Video"}&rdquo;</strong>?
              This action removes the video file from cloud storage and cannot be undone.
            </p>
            {Number(deleteTarget.fileSize || 0) > 0 && (
              <div className="rounded-xl bg-[#E4F0F2]/70 px-3.5 py-2.5 text-xs font-semibold text-[#1F6878]">
                Deleting this video will immediately free {formatStorageBytes(Number(deleteTarget.fileSize))} of storage.
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-[#dce4e5] bg-white px-4 py-2 text-xs font-semibold text-[#15191B] hover:bg-secondary-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-reel-btn"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-danger-600 px-4 py-2 text-xs font-bold text-white hover:bg-danger-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Permanently Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Video Preview Modal */}
      <Modal
        isOpen={Boolean(previewReel)}
        onClose={() => setPreviewReel(null)}
        title={previewReel?.title || "Video Preview"}
        size="sm"
      >
        {previewReel && (
          <div className="space-y-3">
            <div className="aspect-[9/16] max-h-[65vh] w-full overflow-hidden rounded-2xl bg-black">
              <video
                src={resolveApiAsset(previewReel.mediaUrl)}
                poster={previewReel.mobileMediaUrl ? resolveApiAsset(previewReel.mobileMediaUrl) : undefined}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            </div>
            {previewReel.excerpt && (
              <p className="text-xs text-[#707574]">{previewReel.excerpt}</p>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
