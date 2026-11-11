import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ArrowUpRight,
  Check,
  Cloud,
  Film,
  Image,
  Images,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, resolveApiAsset, type SiteContent } from "@/lib/api";
import { MEDIA_CATEGORIES, type ClinicMediaKind, type MediaCategory } from "@/lib/media-store";

const MAX_FILE_BYTES = 150 * 1024 * 1024;
const HOSTED_RECOMMENDED_BYTES = 4.5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const ACCEPTED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

type MediaItem = {
  id: number;
  contentType: "image" | "reel" | "video";
  name: string;
  kind: ClinicMediaKind;
  size: number;
  category: MediaCategory | string;
  createdAt: number;
  includeInGallery: boolean;
  mediaUrl: string;
  previewUrl: string;
};

type Filter = "All" | "Photos" | "Videos";

function getMediaKind(file: File): ClinicMediaKind | null {
  const type = file.type.toLowerCase();
  if (type) {
    if (ACCEPTED_IMAGE_TYPES.has(type)) return "image";
    if (ACCEPTED_VIDEO_TYPES.has(type)) return "video";
    return null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(extension ?? "")) return "image";
  if (["mp4", "webm", "mov"].includes(extension ?? "")) return "video";
  return null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + " MB";
}

function titleFromFilename(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function mapContentToMediaItem(row: SiteContent): MediaItem {
  const kind: ClinicMediaKind = row.type === "reel" || row.type === "video" ? "video" : "image";
  const parsedTime = Date.parse(row.createdAt || row.publishedAt || "");
  const parsedSize = Number(row.seoDescription || 0);
  const mediaUrl = row.mediaUrl || row.media_url || "";
  return {
    id: Number(row.id),
    contentType: row.type === "video" ? "video" : row.type === "reel" ? "reel" : "image",
    name: row.title || (kind === "video" ? "Clinic Video" : "Clinic Photo"),
    kind,
    size: Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 0,
    category: row.category || "Clinic",
    createdAt: Number.isFinite(parsedTime) ? parsedTime : Date.now(),
    includeInGallery: Boolean(row.published),
    mediaUrl,
    previewUrl: resolveApiAsset(mediaUrl),
  };
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [category, setCategory] = useState<MediaCategory>("Clinic");
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshMedia = useCallback(async () => {
    const data = await api.get<{ items: SiteContent[] }>("/api/admin/content");
    const mediaRows = (data.items || []).filter(
      (item) =>
        (item.type === "image" || item.type === "reel" || item.type === "video") &&
        Boolean(item.mediaUrl || item.media_url)
    );
    setItems(mediaRows.map(mapContentToMediaItem));
  }, []);

  useEffect(() => {
    void refreshMedia()
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not load the media library."))
      .finally(() => setIsLoading(false));
  }, [refreshMedia]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const kindMatches = filter === "All" || (filter === "Photos" ? item.kind === "image" : item.kind === "video");
      const searchMatches = !term || item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term);
      return kindMatches && searchMatches;
    });
  }, [filter, items, search]);

  const photoCount = items.filter((item) => item.kind === "image").length;
  const videoCount = items.filter((item) => item.kind === "video").length;
  const liveCount = items.filter((item) => item.includeInGallery).length;

  const saveFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length || isSaving) return;

    setIsSaving(true);
    let saved = 0;
    const rejected: string[] = [];

    try {
      for (const file of files) {
        const kind = getMediaKind(file);
        if (!kind) {
          rejected.push(file.name + ": unsupported format");
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(file.name + ": larger than 150 MB");
          continue;
        }

        try {
          const r2Folder = kind === "video" ? "reels" : "gallery";
          const uploaded = await api.upload(file, r2Folder);
          if (!uploaded?.url) {
            throw new Error("Cloud upload returned no URL.");
          }

          await api.post<{ item: SiteContent }>("/api/admin/content", {
            type: kind === "video" ? "reel" : "image",
            title: titleFromFilename(file.name) || file.name,
            category,
            excerpt: kind === "video" ? `${category} clinic video` : `${category} showcase photo`,
            mediaUrl: uploaded.url,
            seoDescription: String(file.size),
            homepageHighlight: true,
            published: true,
            displayOrder: 0,
          });
          saved += 1;
        } catch (error) {
          let message = error instanceof Error ? error.message : "could not upload";
          if (file.size > HOSTED_RECOMMENDED_BYTES) {
            message += " (keep hosted uploads under 4.5 MB)";
          }
          rejected.push(`${file.name}: ${message}`);
        }
      }

      if (saved) {
        try {
          await refreshMedia();
          toast.success(saved + (saved === 1 ? " file stored & published to website" : " files stored & published to website"));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Files uploaded, but the library could not refresh.");
        }
      }
      if (rejected.length) toast.error(rejected.slice(0, 2).join(" · "));
    } finally {
      setIsSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const updateItem = async (item: MediaItem, patch: Partial<Pick<MediaItem, "category" | "includeInGallery">>) => {
    try {
      await api.patch<{ item: SiteContent }>(`/api/admin/content/${item.id}`, {
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.includeInGallery !== undefined
          ? { published: patch.includeInGallery, homepageHighlight: patch.includeInGallery }
          : {}),
      });
      await refreshMedia();
      toast.success("Website visibility updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this file.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/content/${deleteTarget.id}`);
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      if (preview?.id === deletedId) setPreview(null);
      await refreshMedia();
      toast.success("File removed from website & cloud storage");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this file.");
    } finally {
      setIsDeleting(false);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void saveFiles(event.dataTransfer.files);
  };

  return (
    <DashboardLayout>
      <div className="media-library mx-auto max-w-[1320px] space-y-6">
        <section className="media-hero relative overflow-hidden rounded-[30px] px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="media-hero-orb media-hero-orb-one" />
          <div className="media-hero-orb media-hero-orb-two" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
                <Images className="h-3.5 w-3.5 text-pink-200" /> Practice media
              </p>
              <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">A better view of your work.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
                Upload clinic photos and educational clips directly to your website storage. Toggle any item live so patients see it across the gallery and reels sections.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 text-xs font-medium text-white/80">
                Upload category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as MediaCategory)}
                  className="rounded-lg border-0 bg-transparent py-1 text-xs font-semibold text-white outline-none"
                >
                  {MEDIA_CATEGORIES.map((value) => (
                    <option key={value} value={value} className="bg-[#19312f] text-white">
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isSaving}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#ed2580] px-5 text-sm font-semibold text-[#1e322d] shadow-[0_12px_35px_-14px_rgba(237,37,128,.42)] transition hover:-translate-y-0.5 hover:bg-[#ff5ca5] disabled:cursor-wait disabled:opacity-70"
              >
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add photos or video
              </button>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(event) => {
                  if (event.target.files) void saveFiles(event.target.files);
                }}
              />
            </div>
          </div>
          <div className="relative z-10 mt-8 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-pink-200"><Image className="h-4 w-4" /></span>
              <div><p className="font-display text-xl">{photoCount}</p><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Photos</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-pink-200"><Film className="h-4 w-4" /></span>
              <div><p className="font-display text-xl">{videoCount}</p><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Videos</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-pink-200"><Cloud className="h-4 w-4" /></span>
              <div><p className="font-display text-xl">{liveCount}</p><p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Live on website</p></div>
            </div>
          </div>
        </section>

        <section
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={onDrop}
          className={"media-dropzone rounded-[26px] border border-dashed px-5 py-6 transition sm:px-7 " + (isDragging ? "is-dragging" : "")}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#34695e] shadow-sm"><Upload className="h-5 w-5" /></span>
              <div>
                <h2 className="text-sm font-semibold text-[#20322e]">Drop your files here</h2>
                <p className="mt-1 text-xs leading-5 text-[#687772]">JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM or MOV · stored in Cloudflare R2 (keep hosted uploads under 4.5 MB per file)</p>
              </div>
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-[#cfdcd4] bg-white px-4 text-xs font-semibold text-[#315e53] transition hover:border-[#93b5a6] hover:bg-[#f7fbf7] sm:self-auto">
              Browse files <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="media-kicker">Your collection</p>
            <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-[#1d2a27]">Media library <span className="align-middle font-sans text-sm font-medium text-[#8b9892]">{items.length.toString().padStart(2, "0")}</span></h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex rounded-xl border border-[#dce3dc] bg-white p-1 shadow-sm">
              {(["All", "Photos", "Videos"] as Filter[]).map((value) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={"rounded-lg px-3.5 py-2 text-xs font-semibold transition " + (filter === value ? "bg-[#1c3933] text-white shadow-sm" : "text-[#73807a] hover:text-[#253b34]")}>
                  {value}
                </button>
              ))}
            </div>
            <label className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82918a]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your files" className="h-11 w-full rounded-xl border border-[#dce3dc] bg-white pl-10 pr-4 text-sm text-[#263b35] outline-none transition placeholder:text-[#a1aaa4] focus:border-[#7ba38d] focus:ring-4 focus:ring-[#adc5ac]/20 sm:w-60" />
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="grid min-h-48 place-items-center rounded-[26px] border border-[#e1e7e0] bg-white"><LoaderCircle className="h-6 w-6 animate-spin text-[#508271]" /></div>
        ) : filteredItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const hasCustomCat = !MEDIA_CATEGORIES.includes(item.category as MediaCategory);
              return (
                <article key={item.id} className="media-card group overflow-hidden rounded-[24px] border border-[#e1e7e0] bg-white shadow-[0_4px_24px_-18px_rgba(27,54,44,.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-32px_rgba(27,54,44,.5)]">
                  <button type="button" className="media-preview relative block aspect-[1.68] w-full overflow-hidden bg-[#e5ebe3] text-left" onClick={() => setPreview(item)} aria-label={"Preview " + item.name}>
                    {item.kind === "image" ? (
                      <img src={item.previewUrl} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                    ) : (
                      <video src={item.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#12221d]/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                      {item.kind === "image" ? <Image className="h-3 w-3" /> : <Film className="h-3 w-3" />}
                      {item.kind === "image" ? "PHOTO" : "VIDEO"}
                    </span>
                    <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#274c3f] opacity-0 shadow-sm transition group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span>
                  </button>
                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#243630]" title={item.name}>{item.name}</h3>
                        <p className="mt-1 text-[11px] text-[#8a9690]">
                          {item.size > 0 ? `${formatBytes(item.size)} · ` : `${item.category} · `}
                          {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(item.createdAt)}
                        </p>
                      </div>
                      <button type="button" onClick={() => setDeleteTarget(item)} aria-label={"Delete " + item.name} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#8b9791] transition hover:bg-[#fff0ee] hover:text-[#ba5548]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#edf0eb] pt-3">
                      <select value={item.category} onChange={(event) => void updateItem(item, { category: event.target.value as MediaCategory })} aria-label={"Category for " + item.name} className="min-w-0 rounded-lg border border-[#e4e9e2] bg-[#fafbf8] px-2.5 py-2 text-xs font-medium text-[#64736b] outline-none focus:border-[#8eac9b]">
                        {hasCustomCat && <option value={item.category}>{item.category}</option>}
                        {MEDIA_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                      <button type="button" onClick={() => void updateItem(item, { includeInGallery: !item.includeInGallery })} className={"inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition " + (item.includeInGallery ? "bg-[#edf7dc] text-[#426326]" : "bg-[#f3f5f0] text-[#73817a] hover:bg-[#e9efe4]")} aria-pressed={item.includeInGallery}>
                        {item.includeInGallery ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                        {item.includeInGallery ? "Live on site" : "Publish to site"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid min-h-[320px] place-items-center rounded-[26px] border border-[#e1e7e0] bg-white px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eff4eb] text-[#56816f]"><Images className="h-6 w-6" /></span>
              <h3 className="mt-4 font-display text-xl font-medium text-[#273931]">{items.length ? "No files match that search" : "Your next upload starts here"}</h3>
              <p className="mt-2 text-sm leading-6 text-[#77847d]">{items.length ? "Try another name or switch between photos and videos." : "Add treatment photos and short clips to store them in the cloud and display them on your public website."}</p>
              {!items.length && <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#1c3933] px-4 text-sm font-semibold text-white transition hover:bg-[#294f46]"><Plus className="h-4 w-4" /> Add your first file</button>}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-[#dbe6d9] bg-[#f5f8f0] px-4 py-4 text-[11px] leading-5 text-[#657366] sm:px-5">
          <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-[#708e67]" />
          <p><strong className="font-semibold text-[#405241]">Stored in Cloudflare R2 &amp; D1.</strong> Uploaded photos and videos are saved to your clinic website database and cloud object storage so patients see them across all devices. Photos appear in the Clinic Gallery, and videos appear in Dental Reels when toggled live.</p>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101d19]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={"Preview " + preview.name} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[24px] border border-white/10 bg-[#101d19] shadow-2xl">
            <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white transition hover:bg-black/70"><X className="h-5 w-5" /></button>
            {preview.kind === "image" ? <img src={preview.previewUrl} alt={preview.name} className="max-h-[76vh] w-full object-contain" /> : <video src={preview.previewUrl} controls autoPlay playsInline className="max-h-[76vh] w-full bg-black" />}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-white">
              <div><p className="font-medium">{preview.name}</p><p className="mt-1 text-xs text-white/55">{preview.category}{preview.size > 0 ? ` · ${formatBytes(preview.size)}` : ""}</p></div>
              <button type="button" onClick={() => { setPreview(null); setDeleteTarget(preview); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/75 transition hover:border-red-300/30 hover:bg-red-300/10 hover:text-red-100"><Trash2 className="h-3.5 w-3.5" /> Remove file</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-[#101d19]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-media-title">
          <div className="w-full max-w-md rounded-[24px] border border-[#e4e9e2] bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0ee] text-[#b64a3e]"><Trash2 className="h-5 w-5" /></div>
            <h2 id="delete-media-title" className="mt-4 font-display text-2xl font-medium text-[#23352e]">Remove this file?</h2>
            <p className="mt-2 text-sm leading-6 text-[#6e7b74]"><strong className="font-medium text-[#34443d]">{deleteTarget.name}</strong> will be permanently removed from your website and Cloudflare R2 storage.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="h-10 rounded-xl border border-[#dce3dc] px-4 text-sm font-semibold text-[#56665e] transition hover:bg-[#f6f8f4]">Cancel</button>
              <button type="button" onClick={() => void confirmDelete()} disabled={isDeleting} className="h-10 rounded-xl bg-[#a94438] px-4 text-sm font-semibold text-white transition hover:bg-[#90372d] disabled:opacity-70">{isDeleting ? "Removing..." : "Remove file"}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
