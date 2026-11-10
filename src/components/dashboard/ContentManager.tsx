"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, BadgeCheck, CalendarDays, Clock3, ExternalLink, Eye, GripVertical, Heart, Images, LoaderCircle, Pencil, Plus, Save, Search, Send, Shield, Sparkles, Star, Stethoscope, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Modal } from "@/components/ui/Modal";
import { api, resolveApiAsset, type SiteContent, type SiteContentType } from "@/lib/api";
import { formatArticleDate } from "@/lib/blog";

export type ContentField =
  | "title"
  | "subtitle"
  | "slug"
  | "category"
  | "author"
  | "excerpt"
  | "body"
  | "mediaUrl"
  | "mobileMediaUrl"
  | "logoUrl"
  | "beforeImage"
  | "afterImage"
  | "linkUrl"
  | "secondaryCtaUrl"
  | "secondaryCtaLabel"
  | "ratingScore"
  | "ratingVerified"
  | "reviewCount"
  | "trustBadgeText"
  | "ctaLabel"
  | "badgeText"
  | "startDate"
  | "endDate"
  | "publishedAt"
  | "seoTitle"
  | "seoDescription"
  | "price"
  | "sessions"
  | "duration"
  | "availableForBooking"
  | "qualification"
  | "specialization"
  | "yearsExperience"
  | "registrationNumber"
  | "phone"
  | "email"
  | "homepageHighlight"
  | "patientConsent"
  | "displayOrder"
  | "published";

export type ContentDraft = {
  title: string;
  subtitle: string;
  slug: string;
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
  displayOrder: number;
  published: boolean;
};

const emptyDraft = (): ContentDraft => ({
  title: "",
  subtitle: "",
  slug: "",
  category: "",
  author: "",
  excerpt: "",
  body: "",
  mediaUrl: "",
  mobileMediaUrl: "",
  logoUrl: "",
  beforeImage: "",
  afterImage: "",
  linkUrl: "",
  ctaLabel: "",
  secondaryCtaLabel: "",
  secondaryCtaUrl: "",
  badgeText: "",
  ratingScore: "",
  ratingVerified: false,
  reviewCount: "",
  trustBadgeText: "",
  startDate: "",
  endDate: "",
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
  price: 0,
  sessions: "",
  duration: "",
  availableForBooking: true,
  qualification: "",
  specialization: "",
  yearsExperience: "",
  registrationNumber: "",
  phone: "",
  email: "",
  homepageHighlight: false,
  patientConsent: false,
  displayOrder: 0,
  published: false,
});

type UploadKey = "mediaUrl" | "mobileMediaUrl" | "logoUrl" | "beforeImage" | "afterImage";

function FormCard({ title, hint, children, className = "" }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#e3eaf2] bg-white p-4 sm:p-5 ${className}`}>
    <div className="mb-4 border-b border-[#eff2f5] pb-3">
      <h3 className="text-[13px] font-semibold text-[#20374b]">{title}</h3>
      {hint && <p className="mt-1 text-[11px] leading-5 text-[#8a9bac]">{hint}</p>}
    </div>
    {children}
  </section>;
}

const mediaIsVideo = (url: string) => /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(url);
const highlightIcons = [
  { value: "tooth", label: "Tooth", icon: Stethoscope },
  { value: "sparkle", label: "Sparkle", icon: Sparkles },
  { value: "shield", label: "Shield", icon: Shield },
  { value: "check", label: "Check", icon: BadgeCheck },
  { value: "heart", label: "Care", icon: Heart },
  { value: "clock", label: "Time", icon: Clock3 },
  { value: "activity", label: "Health", icon: Activity },
  { value: "star", label: "Star", icon: Star },
  { value: "eye", label: "Vision", icon: Eye },
  { value: "badge", label: "Quality", icon: BadgeCheck },
];

function MediaField({
  value,
  label,
  hint,
  accept,
  onChange,
  onUpload,
  uploading,
}: {
  value: string;
  label: string;
  hint?: string;
  accept: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:bg-secondary-50">
          {uploading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </label>
      </div>
      <Input
        className="mt-3"
        label="Media URL"
        value={value.startsWith("/api/") ? "" : value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://… or upload above"
      />
      {value && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-card">
          {mediaIsVideo(value) ? (
            <video src={resolveApiAsset(value)} controls playsInline preload="metadata" className="max-h-44 w-full bg-ink-950 object-contain" />
          ) : (
            <img src={resolveApiAsset(value)} alt="" className="max-h-44 w-full bg-white object-contain" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 py-2 text-xs font-medium text-muted-foreground transition hover:text-rose-700"
          >
            <X className="h-3.5 w-3.5" /> Remove media
          </button>
        </div>
      )}
    </div>
  );
}

export function ContentManagerPanel({
  type,
  heading,
  description,
  addLabel,
  fields,
  preview,
  requiredMedia = [],
  viewHref,
  categoryFilter = false,
}: {
  type: SiteContentType;
  heading?: string;
  description?: string;
  addLabel: string;
  fields: ContentField[];
  preview?: (draft: ContentDraft) => ReactNode;
  requiredMedia?: UploadKey[];
  viewHref?: (item: SiteContent) => string | null;
  categoryFilter?: boolean;
}) {
  const [items, setItems] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadKey | "">("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteContent | null>(null);
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [relatedTreatments, setRelatedTreatments] = useState<SiteContent[]>([]);
  const editorFormRef = useRef<HTMLFormElement>(null);
  const publishIntent = useRef<boolean | null>(null);
  const contentType: string = type;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ items: SiteContent[] }>(`/api/admin/content?type=${type}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (cause) {
      setItems([]);
      setError(cause instanceof Error ? cause.message : "Could not load content.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (type !== "badge") return;
    let active = true;
    api.get<{ items: SiteContent[] }>("/api/admin/content?type=treatment")
      .then((data) => { if (active) setRelatedTreatments(Array.isArray(data.items) ? data.items : []); })
      .catch(() => { if (active) setRelatedTreatments([]); });
    return () => { active = false; };
  }, [type]);

  const openCreate = () => {
    setEditing(null);
    const relatedTreatment = type === "badge" ? new URLSearchParams(window.location.search).get("treatment") ?? "" : "";
    setDraft({ ...emptyDraft(), author: type === "blog" ? "Sri Saraswathi Dental Clinic" : "", homepageHighlight: type === "badge", category: relatedTreatment });
    setModalOpen(true);
  };

  const openEdit = (item: SiteContent) => {
    setEditing(item);
    setDraft({
      title: item.title,
      subtitle: item.subtitle,
      slug: item.slug,
      category: item.category,
      author: item.author,
      excerpt: item.excerpt,
      body: item.body,
      mediaUrl: item.mediaUrl,
      mobileMediaUrl: item.mobileMediaUrl,
      logoUrl: item.logoUrl,
      beforeImage: item.beforeImage,
      afterImage: item.afterImage,
      linkUrl: item.linkUrl,
      ctaLabel: item.ctaLabel,
      secondaryCtaLabel: item.secondaryCtaLabel,
      secondaryCtaUrl: item.secondaryCtaUrl,
      badgeText: item.badgeText,
      ratingScore: item.ratingScore,
      ratingVerified: item.ratingVerified,
      reviewCount: item.reviewCount,
      trustBadgeText: item.trustBadgeText,
      startDate: item.startDate,
      endDate: item.endDate,
      publishedAt: item.publishedAt,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      price: item.price ?? 0,
      sessions: item.sessions ?? "",
      duration: item.duration ?? "",
      availableForBooking: item.availableForBooking ?? true,
      qualification: item.qualification ?? "",
      specialization: item.specialization ?? "",
      yearsExperience: item.yearsExperience ?? "",
      registrationNumber: item.registrationNumber ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      homepageHighlight: item.homepageHighlight ?? false,
      patientConsent: item.patientConsent ?? false,
      displayOrder: item.displayOrder,
      published: item.published,
    });
    setModalOpen(true);
  };

  const update = <K extends keyof ContentDraft>(key: K, value: ContentDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const upload = async (key: UploadKey, file: File) => {
    setUploading(key);
    try {
      const targetFolder =
        key === "beforeImage" || key === "afterImage"
          ? "before-after"
          : type === "doctor"
          ? "doctors"
          : type === "treatment"
          ? "treatments"
          : type === "blog"
          ? "blogs"
          : type === "offer"
          ? "offers"
          : type === "reel"
          ? "reels"
          : "gallery";
      const uploaded = await api.upload(file, targetFolder);
      update(key, uploaded.url);
      toast.success("Image uploaded to Cloudflare R2");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not upload this file.");
    } finally {
      setUploading("");
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const requestedPublishState = publishIntent.current;
    publishIntent.current = null;
    if (saving || uploading) return;
    if (!draft.title.trim()) {
      toast.error("Add a title before saving.");
      return;
    }
    for (const key of requiredMedia) {
      if (!draft[key]) {
        toast.error(key === "beforeImage" ? "Add the before image." : key === "afterImage" ? "Add the after image." : "Add the required image.");
        return;
      }
    }
    if (type === "treatment" && !draft.excerpt.trim()) {
      toast.error("Add a short treatment description before saving.");
      return;
    }
    if (type === "doctor" && (!draft.qualification.trim() || !draft.specialization.trim() || !draft.yearsExperience.trim())) {
      toast.error("Add the doctor's qualification, specialization and experience.");
      return;
    }
    if (["gallery", "testimonial"].includes(type) && (requestedPublishState ?? draft.published) && !draft.patientConsent) {
      toast.error("Confirm the patient’s consent before publishing this story.");
      return;
    }
    if (type === "badge" && (!draft.category.trim() || !draft.body.trim())) {
      toast.error("Choose a related treatment and add a short highlight description.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, published: requestedPublishState ?? draft.published, type, title: draft.title.trim(), displayOrder: Number(draft.displayOrder) || 0 };
      if (editing) await api.patch(`/api/admin/content/${editing.id}`, payload);
      else await api.post("/api/admin/content", payload);
      toast.success(editing ? "Changes saved" : `${addLabel} created`);
      setModalOpen(false);
      await refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (item: SiteContent) => {
    try {
      await api.patch(`/api/admin/content/${item.id}`, { published: !item.published });
      await refresh();
      toast.success(item.published ? "Moved to drafts" : "Published");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not update status.");
    }
  };

  const remove = async (item: SiteContent) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/content/${item.id}`);
      await refresh();
      toast.success("Deleted");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not delete this item.");
    }
  };

  const moveItem = async (item: SiteContent, direction: -1 | 1) => {
    const ordered = [...items].sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id);
    const currentIndex = ordered.findIndex((entry) => entry.id === item.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[currentIndex], ordered[nextIndex]] = [ordered[nextIndex], ordered[currentIndex]];
    try {
      await Promise.all(ordered.map((entry, index) => api.patch(`/api/admin/content/${entry.id}`, { displayOrder: index + 1 })));
      await refresh();
      toast.success("Display order updated");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not reorder content.");
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(),
    [items],
  );

  const visible = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (statusFilter === "published" && !item.published) return false;
      if (statusFilter === "draft" && item.published) return false;
      if (!value) return true;
      return [item.title, item.category, item.slug, item.excerpt].some((field) =>
        field.toLowerCase().includes(value),
      );
    });
  }, [items, query, category, statusFilter]);

  const publishedCount = items.filter((item) => item.published).length;
  const mediaAccept =
    type === "reel" || type === "video"
      ? "video/mp4,video/webm,video/quicktime"
      : "image/jpeg,image/png,image/webp,image/avif,image/gif";
  const submitWithPublishState = (published: boolean) => {
    publishIntent.current = published;
    editorFormRef.current?.requestSubmit();
  };
  const editorCard = "rounded-2xl border border-[#e3eaf2] bg-white p-4 sm:p-5";
  const activeSpecializations = draft.specialization.split(",").map((value) => value.trim()).filter(Boolean);
  const specialtyOptions = ["General Dentist", "Endodontist", "Orthodontist", "Pediatric Dentist", "Implantologist", "Periodontist", "Prosthodontist"];

  return (
    <>
      {heading && (
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display-3 text-foreground">{heading}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted-foreground">
          {items.length} total · {publishedCount} published · {items.length - publishedCount} drafts
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {["hero", "offer"].includes(type) && <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by publish status" className="h-9 rounded-lg border border-border bg-card px-3 text-[12.5px] text-foreground focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/10"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select>}
          {categoryFilter && categories.length > 0 && (
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by category"
              className="h-9 rounded-lg border border-border bg-card px-3 text-[12.5px] text-foreground focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/10"
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/10"
            />
          </div>
          {!heading && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {addLabel}
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}

      {loading ? (
        <div className="grid min-h-52 place-items-center rounded-2xl border border-border/70 bg-card">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary-700" />
        </div>
      ) : visible.length && (["hero", "offer"].includes(type)) ? (
        <div className="space-y-4">
          {visible.sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id).map((item, index, orderedItems) => (
            <article key={item.id} className="overflow-hidden rounded-[20px] border border-[#e6e9e7] bg-white shadow-soft">
              <div className="relative overflow-hidden bg-[#edf2f0]">
                {item.mediaUrl ? <img src={resolveApiAsset(item.mediaUrl)} alt="" loading="lazy" className="aspect-[3.2/1] max-h-[340px] w-full object-cover" /> : <div className="grid aspect-[3.2/1] min-h-44 place-items-center text-[#819391]">Upload a banner image</div>}
                <span className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold shadow-sm ${item.published ? "bg-white text-[#138363]" : "bg-white/90 text-[#788489]"}`}><span className={`h-1.5 w-1.5 rounded-full ${item.published ? "bg-emerald-500" : "bg-[#a1abad]"}`} />{item.published ? "Published" : "Draft"}</span>
                {item.badgeText && <span className="absolute bottom-4 left-4 rounded-full bg-[#173c42]/85 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">{item.badgeText}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#24464a]">{item.title}</p><p className="mt-1 truncate text-[11px] text-[#829297]">{item.subtitle || item.excerpt || (type === "hero" ? "Homepage hero slide" : "Offer banner")}{item.startDate || item.endDate ? ` · ${item.startDate || "Now"} → ${item.endDate || "No end date"}` : ""}</p></div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => void moveItem(item, -1)} disabled={index === 0} aria-label={`Move ${item.title} up`} title="Move up" className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7e6e1] text-[#75878a] hover:bg-[#f5f8f7] disabled:opacity-35">↑</button>
                  <button type="button" onClick={() => void moveItem(item, 1)} disabled={index === orderedItems.length - 1} aria-label={`Move ${item.title} down`} title="Move down" className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7e6e1] text-[#75878a] hover:bg-[#f5f8f7] disabled:opacity-35">↓</button>
                  <button type="button" onClick={() => void togglePublish(item)} className={`rounded-lg px-3 py-2 text-[10px] font-semibold ${item.published ? "bg-[#e7f6f0] text-[#138363]" : "bg-[#f4f1ec] text-[#718084]"}`}>{item.published ? "Hide" : "Publish"}</button>
                  <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#6f8587] hover:bg-[#eef5f4] hover:text-[#17545a]"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void remove(item)} aria-label={`Delete ${item.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#899698] hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : visible.length && (["treatment", "doctor"].includes(type)) ? (
        <div className="overflow-x-auto rounded-[20px] border border-[#ece4db] bg-white shadow-soft">
          <div className="grid min-w-[760px] grid-cols-[minmax(280px,1.6fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_minmax(150px,0.7fr)] border-b border-[#ece4db] bg-[#fcfaf7] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a989a]">
            <span>Content</span><span>Last updated</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          <ul className="min-w-[760px] divide-y divide-[#f0ebe5]">
            {visible.map((item) => {
              const thumb = item.mediaUrl || item.afterImage;
              const updated = new Date(item.updatedAt || item.createdAt);
              return (
                <li key={item.id} className="grid grid-cols-[minmax(280px,1.6fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_minmax(150px,0.7fr)] items-center gap-3 px-5 py-4 transition hover:bg-[#fdfcfb]">
                  <div className="flex min-w-0 items-center gap-3">
                    <GripVertical aria-hidden="true" className="h-4 w-4 shrink-0 text-[#b8c0c0]" />
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-[#eee8e1] bg-[#f4f6f5]">
                      {thumb ? <img src={resolveApiAsset(thumb)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#668286]"><Images className="h-5 w-5" /></div>}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#24464a]">{item.title}</p>
                      <p className="mt-1 truncate text-[11px] text-[#829297]">
                        {type === "treatment"
                          ? [item.category, item.sessions && `${item.sessions} sessions`, item.duration].filter(Boolean).join(" · ")
                          : type === "doctor"
                            ? [item.qualification, item.specialization, item.yearsExperience && `${item.yearsExperience} experience`].filter(Boolean).join(" · ")
                            : `${item.category || (type === "hero" ? "Homepage" : "Promotions")}${item.badgeText ? ` · ${item.badgeText}` : ""}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] text-[#607477]">{Number.isNaN(updated.getTime()) ? "—" : updated.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold ${item.published ? "bg-[#e6f6f0] text-[#138363]" : "bg-[#f3efea] text-[#7f8989]"}`}><span className={`h-1.5 w-1.5 rounded-full ${item.published ? "bg-[#17a47b]" : "bg-[#a1abad]"}`} />{item.published ? "Published" : "Draft"}</span></span>
                  <span className="flex items-center justify-end gap-1">
                    {viewHref?.(item) && <a href={viewHref(item) ?? "#"} target="_blank" rel="noreferrer" aria-label={`Preview ${item.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#6f8587] transition hover:bg-[#eef5f4] hover:text-[#17545a]"><Eye className="h-4 w-4" /></a>}
                    {type === "treatment" && <a href={`/dashboard/content?type=badge&treatment=${encodeURIComponent(item.title)}`} className="whitespace-nowrap rounded-lg px-2 py-2 text-[10px] font-semibold text-[#17545a] transition hover:bg-[#eef5f4]">+ Add highlight</a>}
                    <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#6f8587] transition hover:bg-[#eef5f4] hover:text-[#17545a]"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void togglePublish(item)} aria-label={item.published ? `Unpublish ${item.title}` : `Publish ${item.title}`} className="rounded-lg px-2 py-2 text-[10px] font-semibold text-[#17545a] transition hover:bg-[#eef5f4]">{item.published ? "Hide" : "Publish"}</button>
                    <button type="button" onClick={() => void remove(item)} aria-label={`Delete ${item.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#899698] transition hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : visible.length ? (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((item) => {
            const thumb = (type === "reel" || type === "video" ? item.mobileMediaUrl || item.mediaUrl : item.mediaUrl || item.afterImage);
            return (
              <li key={item.id} className="group overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-card">
                <div className={`relative ${type === "reel" ? "aspect-[9/16] max-h-[440px]" : "aspect-[16/9]"} overflow-hidden bg-secondary-50`}>
                  {type === "gallery" ? (
                    <div className="grid h-full grid-cols-2 gap-1.5 bg-[#111820] p-2.5">
                      {[{ label: "Before", src: item.beforeImage }, { label: "After", src: item.afterImage }].map((panel) => <div key={panel.label} className="relative overflow-hidden rounded-lg bg-white/10">{panel.src ? <img src={resolveApiAsset(panel.src)} alt={panel.label} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] text-white/50">{panel.label}</div>}<span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[9px] font-semibold text-white">{panel.label}</span></div>)}
                    </div>
                  ) : thumb ? mediaIsVideo(thumb) ? (
                    <video src={resolveApiAsset(thumb)} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={resolveApiAsset(thumb)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-[#f7f4f0] to-[#eef5f4] text-primary-700"><Images className="h-8 w-8" /></div>
                  )}
                  <span className={"absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm " + (item.published ? "bg-emerald-50 text-emerald-700" : "bg-white/90 text-muted-foreground")}>
                    <span className={"h-1.5 w-1.5 rounded-full " + (item.published ? "bg-emerald-500" : "bg-secondary-400")} />
                    {item.published ? "Published" : "Draft"}
                  </span>
                  {item.badgeText && <span className="absolute bottom-3 left-3 rounded-full bg-[#17464b]/85 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">{item.badgeText}</span>}
                </div>
                <div className="p-4">
                  <div className="min-h-[56px]">
                    <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">{item.title}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      {item.category && <span>{item.category}</span>}
                      {type === "blog" && item.slug && <span className="truncate">/blog/{item.slug}</span>}
                      {(item.startDate || item.endDate) && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{item.startDate ? formatArticleDate(item.startDate) : "—"} → {item.endDate ? formatArticleDate(item.endDate) : "—"}</span>}
                      {type === "blog" && item.publishedAt && <span>{formatArticleDate(item.publishedAt)}</span>}
                    </p>
                    {type === "blog" && item.excerpt && <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#697b7d]">{item.excerpt}</p>}
                  </div>
                  {type === "blog" && item.author && <p className="mt-2 text-[10.5px] font-medium text-[#607477]">By {item.author}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                    {viewHref && viewHref(item) && <Button asChild size="sm" variant="ghost"><a href={viewHref(item) ?? "#"} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> View</a></Button>}
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => void togglePublish(item)}>{item.published ? "Unpublish" : "Publish"}</Button>
                    <button type="button" onClick={() => void remove(item)} aria-label={`Delete ${item.title}`} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <h2 className="font-display text-xl font-medium text-foreground">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Create your first entry — you can keep it as a draft until it is ready for the public site.
          </p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && !uploading && setModalOpen(false)}
        title={editing ? `Edit ${addLabel.toLowerCase()}` : addLabel}
        description="Drafts stay private. Published items appear on the public website immediately."
        size="full"
      >
        <form ref={editorFormRef} onSubmit={save} className="max-h-[78vh] space-y-4 overflow-y-auto pr-1">
          {type === "doctor" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
              <div className="space-y-4">
                <FormCard title="Profile details" hint="Add the dentist’s professional information shown on the team page.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Doctor name" required maxLength={140} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Dr. Full name" />
                    <Input label="Qualification" required maxLength={120} value={draft.qualification} onChange={(event) => update("qualification", event.target.value)} placeholder="BDS, MDS" />
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#516579]">Specialization <span className="text-rose-500">*</span></label>
                      <Input aria-label="Specialization" required maxLength={180} value={draft.specialization} onChange={(event) => update("specialization", event.target.value)} placeholder="Select below or type a specialization" className="mt-1.5" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {specialtyOptions.map((specialty) => {
                          const selected = activeSpecializations.includes(specialty);
                          return <button key={specialty} type="button" aria-pressed={selected} onClick={() => {
                            const next = selected ? activeSpecializations.filter((value) => value !== specialty) : [...activeSpecializations, specialty];
                            update("specialization", next.join(", "));
                          }} className={`rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition ${selected ? "border-[#17545a] bg-[#e8f3f1] text-[#17545a]" : "border-[#e3eaf2] bg-white text-[#748695] hover:border-[#9bbab9]"}`}>{specialty}</button>;
                        })}
                      </div>
                    </div>
                    <Input label="Years of experience" required maxLength={40} value={draft.yearsExperience} onChange={(event) => update("yearsExperience", event.target.value)} placeholder="e.g. 12 years" />
                    <Input label="Dental council registration" maxLength={60} value={draft.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value)} placeholder="Registration number" />
                    <Input label="Contact number" type="tel" maxLength={30} value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Clinic contact number" />
                    <Input label="Email address" type="email" maxLength={120} value={draft.email} onChange={(event) => update("email", event.target.value)} placeholder="doctor@clinic.in" />
                  </div>
                </FormCard>
                <FormCard title="Biography" hint="A concise introduction helps patients get to know their dentist.">
                  <TextArea label="Short biography" rows={3} maxLength={400} value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="A few lines about the dentist’s approach and experience…" />
                  <TextArea className="mt-4" label="Detailed biography" rows={7} maxLength={60000} value={draft.body} onChange={(event) => update("body", event.target.value)} placeholder="Write the full profile, education, clinical interests and care philosophy…" />
                  <p className="mt-1.5 text-[10.5px] text-[#8a9bac]">Use blank lines to separate paragraphs. Use ## for section headings.</p>
                </FormCard>
              </div>
              <aside className="space-y-4">
                <FormCard title="Doctor portrait" hint="A clear vertical portrait works best on the public doctor card.">
                  <MediaField label="Profile photo" hint="Recommended: 600 × 800 px or larger." accept={mediaAccept} value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} />
                </FormCard>
                <FormCard title="Directory card settings">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Feature on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Show this doctor in the home page team section</span></span><input type="checkbox" checked={draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                    <Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} helperText="Lower numbers appear first." />
                    {preview && <div className="pt-1"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#96a3ac]">Card preview</p>{preview(draft)}</div>}
                  </div>
                </FormCard>
              </aside>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2">
                <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button>
                <Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Publish doctor</Button>
              </div>
            </div>
          ) : type === "treatment" ? (
            <div className="space-y-4">
              <FormCard title="Treatment information" hint="Add the patient-facing description, image and appointment details.">
                <Input label="Treatment name" required maxLength={140} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Dental implants" />
                <Input className="mt-4" label="Treatment category" maxLength={60} value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder="Restorative care, family dentistry…" />
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <TextArea label="Short description" required rows={5} maxLength={400} value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="A short introduction shown on treatment cards…" />
                  <TextArea label="Full description" rows={5} maxLength={60000} value={draft.body} onChange={(event) => update("body", event.target.value)} placeholder="Explain the procedure, benefits and what patients can expect…" />
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)]">
                  <MediaField label="Treatment image" hint="Use a landscape image, at least 800 × 600 px." accept={mediaAccept} value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} />
                  <div className="grid content-start gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    <Input label="Treatment price (₹), if confirmed" type="number" min={0} value={draft.price || ""} onChange={(event) => update("price", Number(event.target.value))} placeholder="Optional" />
                    <Input label="Number of sessions, if confirmed" maxLength={80} value={draft.sessions} onChange={(event) => update("sessions", event.target.value)} placeholder="Optional" />
                    <Input label="Estimated duration, if confirmed" maxLength={80} value={draft.duration} onChange={(event) => update("duration", event.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </FormCard>
              <FormCard title="Availability & publishing" hint="Control whether patients can request this treatment and when it appears online.">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Available for booking</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Accept appointment requests</span></span><input type="checkbox" checked={draft.availableForBooking} onChange={(event) => update("availableForBooking", event.target.checked)} className="h-4 w-4 accent-emerald-600" /></label>
                  <Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} />
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on website</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Publish this treatment page</span></span><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Only published treatments can be featured there.</span></span><input type="checkbox" disabled={!draft.published} checked={draft.published && draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                </div>
              </FormCard>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur">
                <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button>
                <Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Publish treatment</Button>
              </div>
            </div>
          ) : type === "badge" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
              <div className="space-y-4">
                <FormCard title="Highlight details" hint="Connect this highlight to a treatment and describe the patient benefit.">
                  <Input label="Highlight title" required maxLength={140} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="A short, clear benefit" />
                  <label className="mt-4 block text-xs font-semibold text-[#516579]">Related treatment <span className="text-rose-500">*</span>
                    <select required value={draft.category} onChange={(event) => update("category", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce4eb] bg-white px-3.5 text-sm font-normal text-[#344c5f] outline-none focus:border-[#4d8989] focus:ring-4 focus:ring-[#4d8989]/10">
                      <option value="">Select a treatment</option>{relatedTreatments.map((treatment) => <option key={treatment.id} value={treatment.title}>{treatment.title}</option>)}
                    </select>
                  </label>
                  <Input className="mt-4" label="Subtitle" maxLength={160} value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="Optional supporting line" />
                  <TextArea className="mt-4" label="Highlight description" required rows={7} maxLength={2000} value={draft.body} onChange={(event) => update("body", event.target.value)} placeholder="Explain why this treatment is a good option for patients…" />
                </FormCard>
                <FormCard title="Choose an icon" hint="Pick a simple symbol that reinforces the treatment benefit.">
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {highlightIcons.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => update("badgeText", value)} aria-label={label} aria-pressed={draft.badgeText === value} className={`grid h-11 place-items-center rounded-xl border transition ${draft.badgeText === value ? "border-[#17545a] bg-[#e8f3f1] text-[#17545a] ring-1 ring-[#17545a]" : "border-[#e3eaf2] bg-white text-[#607477] hover:border-[#b7d4d0] hover:bg-[#f5faf9]"}`}><Icon className="h-4 w-4" /></button>)}
                  </div>
                </FormCard>
              </div>
              <aside className="space-y-4">
                <FormCard title="Highlight image"><MediaField label="Image" hint="A clean landscape photo works well in the highlight strip." accept={mediaAccept} value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} /></FormCard>
                <FormCard title="Display settings">
                  <div className="space-y-3">
                    <Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} helperText="Lower numbers appear first." />
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Feature this highlight on the home page</span></span><input type="checkbox" checked={draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Publish status</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Visible to website visitors</span></span><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                    {preview && <div className="pt-1">{preview(draft)}</div>}
                  </div>
                </FormCard>
              </aside>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2">
                <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button>
                <Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Publish highlight</Button>
              </div>
            </div>
          ) : contentType === "hero" || contentType === "offer" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <FormCard title={contentType === "hero" ? "1. Banner content" : "1. Offer content"} hint={contentType === "hero" ? "Set the key message used on the homepage hero slide." : "Write the offer message that appears in the promotion strip."}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Eyebrow / badge text" required maxLength={60} value={draft.badgeText} onChange={(event) => update("badgeText", event.target.value)} placeholder="Comprehensive care for every smile" />
                    <Input label="Main headline" required maxLength={60} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Your smile deserves" />
                    <Input label="Highlight headline text" required maxLength={30} value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="Expert care" />
                    <Input label="Second headline line" required maxLength={60} value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="A lifetime of confidence" />
                  </div>
                  {contentType === "hero" && <TextArea className="mt-4" label="Supporting description" required rows={4} maxLength={350} value={draft.body} onChange={(event) => update("body", event.target.value)} placeholder="Describe your clinic welcome and patient experience…" />}
                </FormCard>
                {contentType === "hero" && <FormCard title="3. Call to action">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Primary CTA label" required maxLength={40} value={draft.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} placeholder="Book an appointment" />
                    <Input label="Secondary CTA label" required maxLength={50} value={draft.secondaryCtaLabel} onChange={(event) => update("secondaryCtaLabel", event.target.value)} placeholder="Call the clinic" />
                    <Input label="Primary CTA link" required value={draft.linkUrl} onChange={(event) => update("linkUrl", event.target.value)} placeholder="/book-appointment" />
                    <Input label="Secondary CTA phone / URL" required value={draft.secondaryCtaUrl} onChange={(event) => update("secondaryCtaUrl", event.target.value)} placeholder="tel:+919884127284" />
                    <Input label="Clinic phone" type="tel" value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 98841 27284" />
                  </div>
                </FormCard>}
                <FormCard title="5. Ratings & trust">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block text-xs font-semibold text-[#516579]">Verified rating score <input type="number" min={0} max={5} step={0.1} value={draft.ratingScore} onChange={(event) => update("ratingScore", event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#dce4eb] bg-white px-3 text-sm font-normal text-[#344c5f] outline-none focus:border-[#4d8989]" placeholder="Optional, 0–5" /></label>
                    <Input label="Review count" maxLength={20} value={draft.reviewCount} onChange={(event) => update("reviewCount", event.target.value)} placeholder="1.3k+" />
                    <Input label="Trust badge text" maxLength={30} value={draft.trustBadgeText} onChange={(event) => update("trustBadgeText", event.target.value)} placeholder="Google reviews" />
                  </div>
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-950"><span><span className="block">Verified rating information</span><span className="mt-1 block text-[10px] font-normal text-amber-800">Show the score and review count only after checking a current clinic source.</span></span><input type="checkbox" checked={draft.ratingVerified} onChange={(event) => update("ratingVerified", event.target.checked)} className="h-4 w-4 accent-amber-700" /></label>
                </FormCard>
              </div>
              <div className="space-y-4">
                <FormCard title="2. Images & logo" hint={contentType === "hero" ? "Use a wide desktop image and a separate crop for mobile." : "Choose the artwork used behind the offer headline."}>
                  <div className={`grid gap-4 ${contentType === "hero" ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}><MediaField label={contentType === "hero" ? "Desktop background image" : "Mobile background image"} hint={contentType === "hero" ? "Recommended: 1920 × 1080 px." : "Recommended: 768 × 1024 px."} accept="image/jpeg,image/png,image/webp,image/avif,image/gif" value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} />
                  {contentType === "hero" && <MediaField label="Mobile background image" hint="Recommended: 768 × 1024 px." accept="image/jpeg,image/png,image/webp,image/avif,image/gif" value={draft.mobileMediaUrl} onChange={(value) => update("mobileMediaUrl", value)} onUpload={(file) => void upload("mobileMediaUrl", file)} uploading={uploading === "mobileMediaUrl"} />}</div>
                  {contentType === "hero" && <div className="mt-4 border-t border-[#eff2f5] pt-4"><MediaField label="Hero logo / image" hint="PNG or SVG recommended. Use a transparent logo." accept="image/png,image/webp,image/avif,image/svg+xml" value={draft.logoUrl} onChange={(value) => update("logoUrl", value)} onUpload={(file) => void upload("logoUrl", file)} uploading={uploading === "logoUrl"} /></div>}
                </FormCard>
                <FormCard title="4. Display & scheduling">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} helperText="Lower numbers appear first." />
                    <Input label="Start date" type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} />
                    <Input label="End date" type="date" value={draft.endDate} onChange={(event) => update("endDate", event.target.value)} />
                  </div>
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on website</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Only published items are visible to visitors.</span></span><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                </FormCard>
              </div>
              {preview && <div className="xl:col-span-2"><FormCard title="Live banner preview">{preview(draft)}</FormCard></div>}
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2">
                <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button>
                <Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Save & publish {contentType === "hero" ? "banner" : "offer"}</Button>
              </div>
            </div>
          ) : contentType === "reel" || contentType === "video" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(270px,0.72fr)]">
              <div className="space-y-4">
                <FormCard title="Clinical narrative & headings" hint="Give the video a helpful title and a short patient-friendly caption.">
                  <Input label="Headline" required maxLength={140} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="A gentle root canal experience" />
                  <TextArea className="mt-4" label="Caption / description" rows={3} maxLength={400} value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="What should patients know about this clip?" />
                </FormCard>
                <FormCard title="Primary video file" hint="Upload a short vertical reel or a clinic video.">
                  <MediaField label="Video file" hint="MP4, MOV or WEBM. Vertical 9:16 works best for reels." accept="video/mp4,video/webm,video/quicktime" value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} />
                </FormCard>
                <FormCard title="Vertical thumbnail" hint="A poster image is used before the video starts playing.">
                  <MediaField label="Poster image" hint="Recommended: 1080 × 1920 px." accept="image/jpeg,image/png,image/webp,image/avif,image/gif" value={draft.mobileMediaUrl} onChange={(value) => update("mobileMediaUrl", value)} onUpload={(file) => void upload("mobileMediaUrl", file)} uploading={uploading === "mobileMediaUrl"} />
                </FormCard>
              </div>
              <aside className="space-y-4">
                <FormCard title="Publish parameters">
                  <label className="block text-xs font-semibold text-[#516579]">Publish status
                    <select value={draft.published ? "published" : "draft"} onChange={(event) => update("published", event.target.value === "published")} className="mt-1.5 h-11 w-full rounded-xl border border-[#dce4eb] bg-white px-3.5 text-sm font-normal text-[#344c5f] outline-none focus:border-[#4d8989] focus:ring-4 focus:ring-[#4d8989]/10"><option value="draft">Draft (staged only)</option><option value="published">Published</option></select>
                  </label>
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Only published reels with this enabled appear on the homepage.</span></span><input type="checkbox" disabled={!draft.published} checked={draft.published && draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                  <Input className="mt-4" label="Display carousel order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} helperText="Priority 1 appears first." />
                </FormCard>
                {draft.mediaUrl && <div className="mx-auto max-w-[230px] overflow-hidden rounded-[24px] border border-[#e3eaf2] bg-[#101619] p-2 shadow-soft"><div className="aspect-[9/16] overflow-hidden rounded-[18px] bg-black">{mediaIsVideo(draft.mediaUrl) ? <video src={resolveApiAsset(draft.mediaUrl)} poster={draft.mobileMediaUrl ? resolveApiAsset(draft.mobileMediaUrl) : undefined} controls playsInline className="h-full w-full object-cover" /> : <img src={resolveApiAsset(draft.mobileMediaUrl || draft.mediaUrl)} alt="" className="h-full w-full object-cover" />}</div><p className="px-2 py-3 text-center text-xs font-medium text-white">{draft.title || "Reel preview"}</p></div>}
              </aside>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2">
                <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button>
                <Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Publish {contentType === "reel" ? "reel" : "video"}</Button>
              </div>
            </div>
          ) : contentType === "gallery" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(270px,0.72fr)]">
              <div className="space-y-4">
                <FormCard title="Add new showcase" hint="Before and after photos should show the same smile from a similar angle.">
                  <Input label="Showcase title" required maxLength={140} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Smile restoration" />
                  <Input className="mt-4" label="Treatment label" maxLength={80} value={draft.badgeText} onChange={(event) => update("badgeText", event.target.value)} placeholder="e.g. Invisalign" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <MediaField label="Before image" hint="JPG, PNG or WEBP." accept="image/jpeg,image/png,image/webp,image/avif" value={draft.beforeImage} onChange={(value) => update("beforeImage", value)} onUpload={(file) => void upload("beforeImage", file)} uploading={uploading === "beforeImage"} />
                    <MediaField label="After image" hint="JPG, PNG or WEBP." accept="image/jpeg,image/png,image/webp,image/avif" value={draft.afterImage} onChange={(value) => update("afterImage", value)} onUpload={(file) => void upload("afterImage", file)} uploading={uploading === "afterImage"} />
                  </div>
                  <TextArea className="mt-4" label="Patient message banner" rows={3} maxLength={200} value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="A short message shown with this transformation" />
                </FormCard>
                <FormCard title="Showcase publishing" hint="Publish a case only after confirming the patient has approved these exact photos for public use.">
                  <div className="grid gap-4 sm:grid-cols-2"><Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} /><label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Patient consent confirmed</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Required before this patient story can be published.</span></span><input type="checkbox" checked={draft.patientConsent} onChange={(event) => update("patientConsent", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label><label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Publish showcase</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Show on its public showcase page</span></span><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label><label className="flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Only published cases are shown.</span></span><input type="checkbox" disabled={!draft.published} checked={draft.published && draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label></div>
                </FormCard>
              </div>
              <aside><p className="mb-2 text-xs font-semibold text-[#516579]">Preview</p><div className="mx-auto max-w-[310px] overflow-hidden rounded-[24px] border-[6px] border-[#1e2632] bg-[#111820] p-3 shadow-lg"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">★ {draft.badgeText || "Smile showcase"}</p>{[["Before", draft.beforeImage], ["After", draft.afterImage]].map(([label, src]) => <div key={label} className="mb-3"><p className="mb-1 text-center text-[9px] font-bold uppercase text-white/70">{label}</p><div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/10">{src ? <img src={resolveApiAsset(src)} alt={`${label} result preview`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] text-white/40">Add {label.toLowerCase()} photo</div>}</div></div>)}<p className="pb-1 text-center text-[10px] text-white/60">{draft.title || "Smile transformation"}</p></div></aside>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2">
                <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button>
                <Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Save showcase</Button>
              </div>
            </div>
          ) : contentType === "image" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="space-y-4">
                <FormCard title="Clinic photo details" hint="Choose an image that helps patients see the clinic and the people who care for them.">
                  <Input label="Photo title" required maxLength={140} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Main treatment room" />
                  <Input className="mt-4" label="Caption" maxLength={240} value={draft.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="Optional description shown with the photo" />
                  <Input className="mt-4" label="Category" maxLength={60} value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder="Reception, treatment room, equipment…" />
                </FormCard>
                <FormCard title="Photo">
                  <MediaField label="Clinic photo" hint="High-quality JPEG, PNG or WEBP image." accept="image/jpeg,image/png,image/webp,image/avif,image/gif" value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} />
                </FormCard>
              </div>
                <FormCard title="Gallery display">
                <Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} helperText="Lower numbers appear first." />
                <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Publish photo</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Show on the dedicated clinic gallery</span></span><input type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Show on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Choose this independently of publishing.</span></span><input type="checkbox" disabled={!draft.published} checked={draft.published && draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                {draft.mediaUrl && <img src={resolveApiAsset(draft.mediaUrl)} alt="Clinic photo preview" className="mt-4 aspect-[4/3] w-full rounded-xl object-cover" />}
              </FormCard>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2"><Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button><Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Publish photo</Button></div>
            </div>
          ) : contentType === "blog" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.82fr)]">
              <div className="space-y-4">
                <FormCard title="Post details">
                  <Input label="Blog title" required maxLength={255} value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Enter a clear article title" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2"><Input label="Author" maxLength={80} value={draft.author} onChange={(event) => update("author", event.target.value)} placeholder="Select or enter an author" /><Input label="Category" maxLength={60} value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder="Oral health" /></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2"><MediaField label="Featured image" hint="Recommended: 1200 × 800 px." accept="image/jpeg,image/png,image/webp,image/avif" value={draft.mediaUrl} onChange={(value) => update("mediaUrl", value)} onUpload={(file) => void upload("mediaUrl", file)} uploading={uploading === "mediaUrl"} /><TextArea label="Short description / excerpt" rows={7} maxLength={400} value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="A short summary for article cards…" /></div>
                </FormCard>
                <FormCard title="Blog content" hint="Write the complete patient education article. Use the toolbar to add simple Markdown formatting.">
                  <div className="mb-2 flex flex-wrap items-center gap-1 rounded-t-lg border border-[#dce4eb] bg-[#f8fafb] p-1.5">
                    {[["H2", "\n## Section heading\n"], ["Bold", "**bold text**"], ["Italic", "*italic text*"], ["List", "\n- List item\n"], ["Link", "[link text](https://example.com)"]].map(([label, markdown]) => <button key={label} type="button" onClick={() => update("body", `${draft.body}${draft.body ? "\n" : ""}${markdown}`)} className="rounded-md border border-[#e4eaf0] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#52697d] transition hover:bg-[#edf5f4]">{label}</button>)}
                  </div>
                  <TextArea aria-label="Blog content" rows={14} maxLength={60000} value={draft.body} onChange={(event) => update("body", event.target.value)} placeholder="Write your blog content here…" className="rounded-t-none" />
                  <div className="mt-1 flex justify-between text-[10px] text-[#92a0ae]"><span>{draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0} words</span><span>{draft.body.length} characters</span></div>
                </FormCard>
                <FormCard title="Search preview settings">
                  <div className="grid gap-4 sm:grid-cols-2"><Input label="Public URL slug" value={draft.slug} onChange={(event) => update("slug", event.target.value)} placeholder="auto-generated from title" /><Input label="SEO meta title" maxLength={80} value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /></div>
                  <TextArea className="mt-4" label="SEO meta description" rows={3} maxLength={200} value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} />
                </FormCard>
              </div>
              <aside className="space-y-4">
              <FormCard title="Publish">
                  <p className="text-xs font-semibold text-[#516579]">Visibility</p><p className="mt-1 text-[11px] text-[#8a9bac]">Published posts appear on the public blog page.</p>
                  <Input className="mt-4" label="Publication date" type="date" value={draft.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} />
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#e7edf1] bg-[#fbfcfd] px-3.5 py-3 text-xs font-medium text-[#3c5366]"><span><span className="block">Feature on homepage</span><span className="mt-1 block text-[10px] font-normal text-[#8a9bac]">Include in the home page article section</span></span><input type="checkbox" checked={draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-[#17545a]" /></label>
                  {preview && <div className="mt-4">{preview(draft)}</div>}
                </FormCard>
                <FormCard title="Post checklist">
                  <div className="space-y-3">{[["Blog title", Boolean(draft.title.trim())], ["Category", Boolean(draft.category.trim())], ["Author", Boolean(draft.author.trim())], ["Featured image", Boolean(draft.mediaUrl)], ["Short description", Boolean(draft.excerpt.trim())], ["Blog content", Boolean(draft.body.trim())], ["Publication date", Boolean(draft.publishedAt)]].map(([label, complete]) => <div key={String(label)} className="flex items-center justify-between text-[11px] text-[#64778a]"><span>{label}</span><span className={`grid h-5 w-5 place-items-center rounded-full ${complete ? "bg-emerald-50 text-emerald-600" : "bg-[#f2f4f6] text-[#aab4bf]"}`}>{complete ? "✓" : "·"}</span></div>)}</div>
                </FormCard>
              </aside>
              <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-[#e5eaf0] bg-white/95 py-3 backdrop-blur xl:col-span-2"><Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(false)}><Save className="h-4 w-4" /> Save draft</Button><Button type="button" disabled={saving || Boolean(uploading)} onClick={() => submitWithPublishState(true)}><Send className="h-4 w-4" /> Publish post</Button></div>
            </div>
          ) : (
            <>
          {fields.includes("title") && (
            <Input
              label={contentType === "hero" ? "Banner name" : contentType === "treatment" ? "Treatment Name" : contentType === "doctor" ? "Doctor name" : contentType === "testimonial" ? "Story headline" : contentType === "achievement" ? "Achievement title" : "Title"}
              required
              maxLength={140}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              helperText={contentType === "hero" ? "Used only inside the dashboard to identify this image." : undefined}
            />
          )}
          {fields.includes("slug") && (
            <Input
              label="Slug"
              value={draft.slug}
              onChange={(event) => update("slug", event.target.value)}
              placeholder="auto-generated from the title"
              helperText="Public URL: /blog/your-slug"
            />
          )}
          {fields.includes("subtitle") && (
            <Input
              label={contentType === "offer" ? "Short promotional message" : contentType === "doctor" ? "Professional title" : contentType === "testimonial" ? "Optional review heading" : "Subtitle"}
              maxLength={240}
              value={draft.subtitle}
              onChange={(event) => update("subtitle", event.target.value)}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.includes("category") && (
              contentType === "badge" && relatedTreatments.length ? (
                <label className="block text-sm font-medium text-foreground/75">Related treatment <span className="text-rose-500">*</span>
                  <select required value={draft.category} onChange={(event) => update("category", event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10">
                    <option value="">Select treatment</option>
                    {relatedTreatments.map((treatment) => <option key={treatment.id} value={treatment.title}>{treatment.title}</option>)}
                  </select>
                </label>
              ) : <Input label={contentType === "badge" ? "Related treatment" : "Category"} required={contentType === "badge"} maxLength={60} value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder={contentType === "badge" ? "e.g. Dental implants" : "e.g. Preventive care"} />
            )}
            {fields.includes("author") && (
              <Input label={contentType === "testimonial" ? "Patient-approved display name" : "Author"} maxLength={80} value={draft.author} onChange={(event) => update("author", event.target.value)} />
            )}
            {fields.includes("ratingScore") && (
              <Input label="Verified patient rating (optional)" type="number" min={0} max={5} step={0.1} value={draft.ratingScore} onChange={(event) => update("ratingScore", event.target.value)} placeholder="0–5" />
            )}
            {fields.includes("ratingVerified") && (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 sm:col-span-2"><span><span className="block">Verified rating information</span><span className="mt-0.5 block text-xs font-normal text-amber-800">Only show a score after confirming it against the patient’s approved review.</span></span><input type="checkbox" checked={draft.ratingVerified} onChange={(event) => update("ratingVerified", event.target.checked)} className="h-4 w-4 accent-amber-700" /></label>
            )}
            {fields.includes("qualification") && (
              <Input label="Qualification" maxLength={120} value={draft.qualification} onChange={(event) => update("qualification", event.target.value)} placeholder="e.g. MDS, BDS" />
            )}
            {fields.includes("specialization") && (
              <Input label="Primary specialization" maxLength={120} value={draft.specialization} onChange={(event) => update("specialization", event.target.value)} placeholder="e.g. Endodontist" />
            )}
            {fields.includes("yearsExperience") && (
              <Input label="Years of experience" maxLength={40} value={draft.yearsExperience} onChange={(event) => update("yearsExperience", event.target.value)} placeholder="e.g. 12 years" />
            )}
            {fields.includes("registrationNumber") && (
              <Input label="Dental council registration" maxLength={60} value={draft.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value)} />
            )}
            {fields.includes("phone") && (
              <Input label="Contact number" type="tel" maxLength={30} value={draft.phone} onChange={(event) => update("phone", event.target.value)} />
            )}
            {fields.includes("email") && (
              <Input label="Email address" type="email" maxLength={120} value={draft.email} onChange={(event) => update("email", event.target.value)} />
            )}
            {fields.includes("badgeText") && (
              contentType === "badge" ? (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium text-foreground/75">Highlight Icon</legend>
                  <div className="grid grid-cols-5 gap-2">
                    {highlightIcons.map(({ value, label, icon: Icon }) => (
                      <button key={value} type="button" onClick={() => update("badgeText", value)} aria-label={label} aria-pressed={draft.badgeText === value} className={`grid h-12 place-items-center rounded-xl border transition ${draft.badgeText === value ? "border-[#17545a] bg-[#e6f4f1] text-[#17545a] ring-1 ring-[#17545a]" : "border-border/70 bg-card text-[#607477] hover:border-[#b7d4d0] hover:bg-[#f5faf9]"}`}>
                        <Icon className="h-5 w-5" />
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : <Input label="Label" maxLength={80} value={draft.badgeText} onChange={(event) => update("badgeText", event.target.value)} placeholder="e.g. Limited offer" />
            )}
            {fields.includes("ctaLabel") && (
              <Input label="CTA label" maxLength={40} value={draft.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} placeholder="View offer" />
            )}
            {fields.includes("publishedAt") && (
              <Input label="Publication date" type="date" value={draft.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} />
            )}
            {fields.includes("startDate") && (
              <Input label="Start date" type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} />
            )}
            {fields.includes("endDate") && (
              <Input label="End date" type="date" value={draft.endDate} onChange={(event) => update("endDate", event.target.value)} />
            )}
          </div>
          {fields.includes("excerpt") && (
            <TextArea label={contentType === "treatment" ? "Short Description" : contentType === "doctor" ? "Short Biography" : contentType === "testimonial" ? "Short review quote" : "Short excerpt"} required={contentType === "treatment"} rows={contentType === "treatment" ? 4 : 2} maxLength={400} value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} />
          )}
          {fields.includes("body") && (
            <div>
              <TextArea
                label={contentType === "treatment" ? "Full Description" : contentType === "doctor" ? "Detailed profile" : contentType === "badge" ? "Highlight Description" : contentType === "testimonial" ? "Patient’s review" : contentType === "achievement" ? "Achievement details" : "Full article"}
                rows={12}
                maxLength={60000}
                required={contentType === "badge"}
                value={draft.body}
                onChange={(event) => update("body", event.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Blank lines separate paragraphs. Use ## for headings, - for lists and [text](https://…) for links.
              </p>
            </div>
          )}
          {fields.includes("linkUrl") && (
            <Input label="CTA destination" value={draft.linkUrl} onChange={(event) => update("linkUrl", event.target.value)} placeholder="/booking or https://…" />
          )}
          {fields.includes("price") && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Treatment Price (₹)" type="number" min={0} max={10000000} required value={draft.price || ""} onChange={(event) => update("price", Number(event.target.value))} placeholder="Enter price" />
              {fields.includes("sessions") && <Input label="Number of Sessions" required maxLength={80} value={draft.sessions} onChange={(event) => update("sessions", event.target.value)} placeholder="e.g. 3–5 sessions" />}
              {fields.includes("duration") && <Input label="Estimated Duration" required maxLength={80} value={draft.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. 30–60 mins" />}
            </div>
          )}
          {fields.includes("mediaUrl") && (
            <MediaField
              label={contentType === "blog" ? "Featured image" : contentType === "hero" ? "Desktop image" : contentType === "treatment" ? "Treatment image" : contentType === "doctor" ? "Doctor portrait" : contentType === "badge" ? "Highlight image" : contentType === "achievement" ? "Award or certificate image" : contentType === "testimonial" ? "Patient photo (optional)" : "Image (optional)"}
              hint={
                contentType === "hero"
                  ? "Cropped into a portrait frame (4:4.6). Use a portrait photo at least 1080 × 1240 px, subject centred."
                  : contentType === "blog"
                    ? "Landscape works best — 1200 × 800 px or larger."
                    : contentType === "treatment"
                      ? "Landscape treatment photo recommended — 800 × 600 px or larger."
                      : contentType === "doctor"
                        ? "Portrait photo recommended — 600 × 800 px or larger."
                        : contentType === "gallery"
                          ? "Square crop works best — at least 1000 × 1000 px."
                          : "Use the largest original you have — at least 1000 px wide."
              }
              accept={mediaAccept}
              value={draft.mediaUrl}
              onChange={(value) => update("mediaUrl", value)}
              onUpload={(file) => void upload("mediaUrl", file)}
              uploading={uploading === "mediaUrl"}
            />
          )}
          {fields.includes("mobileMediaUrl") && (
            <MediaField
              label="Mobile image (optional)"
              hint="Shown on phones instead of the desktop image — portrait, at least 720 × 830 px."
              accept={mediaAccept}
              value={draft.mobileMediaUrl}
              onChange={(value) => update("mobileMediaUrl", value)}
              onUpload={(file) => void upload("mobileMediaUrl", file)}
              uploading={uploading === "mobileMediaUrl"}
            />
          )}
          {fields.includes("beforeImage") && (
            <MediaField
              label="Before image"
              accept={mediaAccept}
              value={draft.beforeImage}
              onChange={(value) => update("beforeImage", value)}
              onUpload={(file) => void upload("beforeImage", file)}
              uploading={uploading === "beforeImage"}
            />
          )}
          {fields.includes("afterImage") && (
            <MediaField
              label="After image"
              accept={mediaAccept}
              value={draft.afterImage}
              onChange={(value) => update("afterImage", value)}
              onUpload={(file) => void upload("afterImage", file)}
              uploading={uploading === "afterImage"}
            />
          )}
          {fields.includes("seoTitle") && (
            <Input label="SEO title" maxLength={80} value={draft.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} />
          )}
          {fields.includes("seoDescription") && (
            <TextArea label="SEO description" rows={2} maxLength={200} value={draft.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.includes("displayOrder") && (
              <Input label="Display order" type="number" min={0} max={9999} value={draft.displayOrder} onChange={(event) => update("displayOrder", Number(event.target.value))} />
            )}
            {fields.includes("availableForBooking") && (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm font-medium text-foreground/80">
                <span><span className="block">Availability</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Available for booking</span></span>
                <input type="checkbox" checked={draft.availableForBooking} onChange={(event) => update("availableForBooking", event.target.checked)} className="h-4 w-4 accent-emerald-600" />
              </label>
            )}
            {fields.includes("homepageHighlight") && (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm font-medium text-foreground/80">
              <span><span className="block">{contentType === "badge" ? "Show on Homepage" : contentType === "doctor" ? "Feature on homepage" : "Show on homepage"}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Show this published content on the homepage as well as its dedicated page.</span></span>
                <input type="checkbox" checked={draft.homepageHighlight} onChange={(event) => update("homepageHighlight", event.target.checked)} className="h-4 w-4 accent-primary" />
              </label>
            )}
            {fields.includes("patientConsent") && (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 sm:col-span-2">
                <span><span className="block">Patient consent confirmed</span><span className="mt-0.5 block text-xs font-normal text-amber-800">Required for patient stories, photos and reviews. Confirm permission before publishing.</span></span>
                <input type="checkbox" checked={draft.patientConsent} onChange={(event) => update("patientConsent", event.target.checked)} className="h-4 w-4 accent-amber-700" />
              </label>
            )}
            {fields.includes("published") && (
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-foreground/80">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(event) => update("published", event.target.checked)}
                  className="mb-0.5 h-4 w-4 accent-primary"
                />
                Publish on the public website
              </label>
            )}
          </div>

          {preview && (
            <div className="rounded-2xl border border-border/70 bg-secondary-50/40 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview</p>
              {preview(draft)}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" disabled={saving || Boolean(uploading)} onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={Boolean(uploading)}>
              <Save className="h-4 w-4" /> {editing ? "Save changes" : "Create"}
            </Button>
          </div>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}

export function ContentManager(props: Parameters<typeof ContentManagerPanel>[0]) {
  return (
    <DashboardLayout>
      <ContentManagerPanel {...props} />
    </DashboardLayout>
  );
}
