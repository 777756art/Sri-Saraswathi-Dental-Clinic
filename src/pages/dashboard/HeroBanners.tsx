"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Eye,
  Image as ImageIcon,
  Layers,
  Loader2,
  MousePointerClick,
  Palette,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  api,
  resolveApiAsset,
  type SiteContent,
} from "@/lib/api";
import {
  DEFAULT_HERO_CONFIG,
  DEFAULT_HERO_CONTENT,
  hexToRgba,
  parseHeroStyleConfig,
  serializeHeroStyleConfig,
  type HeroBannerConfig,
} from "@/lib/hero-banner-config";

const OVERLAY_COLOR_PRESETS = [
  { label: "Pure White", value: "#ffffff" },
  { label: "Cream", value: "#F5F2EB" },
  { label: "Dark Teal", value: "#1F6878" },
  { label: "Dark Text", value: "#15191B" },
  { label: "Pale Blue", value: "#E4F0F2" },
];

const BUTTON_COLOR_PRESETS = [
  { label: "Coral", value: "#E95A35" },
  { label: "Dark Teal", value: "#1F6878" },
  { label: "WhatsApp Green", value: "#19B987" },
  { label: "Royal Blue", value: "#2563eb" },
  { label: "Dark Text", value: "#15191B" },
];

export default function HeroBannersPage() {
  const [existingItem, setExistingItem] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 1. Hero Content
  const [heading, setHeading] = useState(DEFAULT_HERO_CONTENT.title);
  const [description, setDescription] = useState(DEFAULT_HERO_CONTENT.description);

  // 2. Hero Banner Image (Foreground Right-Side)
  const [heroImage, setHeroImage] = useState(DEFAULT_HERO_CONTENT.heroImage);

  // 3. Background Image (Full-Width)
  const [backgroundImage, setBackgroundImage] = useState(DEFAULT_HERO_CONTENT.backgroundImage);

  // 4. Background Overlay & Opacity
  const [overlayColor, setOverlayColor] = useState(DEFAULT_HERO_CONFIG.overlayColor);
  const [overlayOpacity, setOverlayOpacity] = useState(DEFAULT_HERO_CONFIG.overlayOpacity);

  // 5. CTA Button Settings
  const [btnText, setBtnText] = useState(DEFAULT_HERO_CONTENT.btnText);
  const [btnLink, setBtnLink] = useState(DEFAULT_HERO_CONTENT.btnLink);
  const [btnColor, setBtnColor] = useState(DEFAULT_HERO_CONFIG.btnColor);
  const [btnOpacity, setBtnOpacity] = useState(DEFAULT_HERO_CONFIG.btnOpacity);

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Load existing hero banner content on mount
  const loadHeroBanner = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: SiteContent[] }>("/api/admin/content?type=hero");
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length > 0) {
        const item = items[0];
        setExistingItem(item);
        if (item.title) setHeading(item.title);
        if (item.body && item.body.trim().length > 10) {
          setDescription(item.body);
        } else if (item.excerpt && item.excerpt.trim().length > 10) {
          setDescription(item.excerpt);
        } else {
          setDescription(DEFAULT_HERO_CONTENT.description);
        }
        if (item.mediaUrl) setHeroImage(item.mediaUrl);
        if (item.mobileMediaUrl) setBackgroundImage(item.mobileMediaUrl);
        if (item.ctaLabel) setBtnText(item.ctaLabel);
        if (item.linkUrl) setBtnLink(item.linkUrl);

        const config = parseHeroStyleConfig(item.seoDescription);
        setOverlayColor(config.overlayColor);
        setOverlayOpacity(config.overlayOpacity);
        setBtnColor(config.btnColor);
        setBtnOpacity(config.btnOpacity);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load existing hero banner.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHeroBanner();
  }, [loadHeroBanner]);

  // Handle uploading Foreground Hero Image (800 x 800)
  const handleHeroImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const uploaded = await api.upload(file, "banners");
      setHeroImage(uploaded.url);
      setIsDirty(true);
      toast.success("Hero promotional image uploaded to Cloudflare R2!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingHero(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    }
  };

  // Handle uploading Background Image (1920 x 1080)
  const handleBgImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const uploaded = await api.upload(file, "banners");
      setBackgroundImage(uploaded.url);
      setIsDirty(true);
      toast.success("Background interior image uploaded to Cloudflare R2!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Background image upload failed.");
    } finally {
      setUploadingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = "";
    }
  };

  // Save changes to backend
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving || uploadingHero || uploadingBg) return;

    if (!heading.trim()) {
      toast.error("Main Heading is required.");
      return;
    }
    if (!heroImage.trim()) {
      toast.error("Hero Banner Image (Foreground) is required.");
      return;
    }
    if (!backgroundImage.trim()) {
      toast.error("Background Image (Full-Width) is required.");
      return;
    }
    if (!btnText.trim()) {
      toast.error("Button Text is required.");
      return;
    }
    if (!btnLink.trim()) {
      toast.error("Button Link is required.");
      return;
    }

    setSaving(true);
    try {
      const stylePayload: HeroBannerConfig = {
        overlayColor,
        overlayOpacity: Number(overlayOpacity),
        btnColor,
        btnOpacity: Number(btnOpacity),
      };

      const payload = {
        type: "hero",
        title: heading.trim(),
        subtitle: "",
        excerpt: "",
        body: description.trim(),
        mediaUrl: heroImage.trim(),
        mobileMediaUrl: backgroundImage.trim(),
        ctaLabel: btnText.trim(),
        linkUrl: btnLink.trim(),
        seoDescription: serializeHeroStyleConfig(stylePayload),
        badgeText: existingItem?.badgeText || "Complete Dental Care for Every Generation",
        ratingScore: existingItem?.ratingScore || "4.8",
        reviewCount: existingItem?.reviewCount || "1.1k",
        trustBadgeText: existingItem?.trustBadgeText || "12 +",
        published: true,
        displayOrder: 0,
      };

      if (existingItem?.id) {
        const res = await api.patch<{ item: SiteContent }>(
          `/api/admin/content/${existingItem.id}`,
          payload
        );
        setExistingItem(res.item);
      } else {
        const res = await api.post<{ item: SiteContent }>("/api/admin/content", payload);
        setExistingItem(res.item);
      }

      setIsDirty(false);
      toast.success("Hero Banner saved & published to homepage!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hero banner.");
    } finally {
      setSaving(false);
    }
  };

  const scrollToPreview = () => {
    previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const previewHeroImage = heroImage ? resolveApiAsset(heroImage) : DEFAULT_HERO_CONTENT.heroImage;
  const previewBgImage = backgroundImage ? resolveApiAsset(backgroundImage) : DEFAULT_HERO_CONTENT.backgroundImage;
  const previewBtnBg = hexToRgba(btnColor, btnOpacity / 100);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1520px] pb-28 text-[#1F6878]">
        {/* Page Top Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#1F6878]/15 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F0F2] px-3 py-1 text-[11px] font-bold text-[#1F6878]">
                <span className="h-2 w-2 rounded-full bg-[#1F6878] animate-pulse" />
                Live on Homepage
              </span>
              {isDirty && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-[#1F6878] sm:text-3xl">
              Home Page Hero Banner
            </h1>
            <p className="mt-1 text-[13px] text-[#707574]">
              Manage headline messaging, foreground promotional visuals, background interior photo, overlay transparency, and call-to-action button.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToPreview}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#1F6878]/25 bg-white px-4 text-[13px] font-semibold text-[#1F6878] shadow-sm transition hover:bg-[#E4F0F2] hover:border-[#1F6878]/40"
            >
              <Eye className="h-4 w-4 text-[#1F6878]" />
              Live Preview
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || uploadingHero || uploadingBg}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#E95A35] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl bg-white p-12 shadow-sm border border-[#1F6878]/15">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1F6878]" />
              <p className="mt-3 text-[14px] font-semibold text-[#1F6878]">
                Loading Hero Banner settings...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* GRID OF MANAGEMENT SECTIONS */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* SECTION 1: HERO CONTENT */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-[#E4F0F2] pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                    <Type className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1F6878]">
                      1. Hero Content
                    </h2>
                    <p className="text-[12px] text-[#707574]">
                      Main headline and supporting description
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Main Heading <span className="text-[#E95A35]">*</span>
                      </label>
                      <span className="text-[11px] text-[#707574]">
                        {heading.length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={heading}
                      onChange={(e) => {
                        setHeading(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="e.g. Your Smile Deserves Expert Care. A Lifetime of Confidence"
                      className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-3 text-[14px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                    />
                    <p className="mt-1.5 text-[11.5px] text-[#707574]">
                      Include the phrase <strong className="text-[#1F6878]">&quot;Expert Care&quot;</strong> to automatically highlight it in the Forest Green accent.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Description <span className="text-[11px] font-normal text-[#707574]">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-[#707574]">
                        {description.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Briefly describe what makes Sri Saraswathi Dental Clinic special..."
                      className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-3 text-[13.5px] leading-relaxed text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: CTA BUTTON SETTINGS */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-[#E4F0F2] pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1F6878]">
                      5. CTA Button Settings
                    </h2>
                    <p className="text-[12px] text-[#707574]">
                      Primary call-to-action button, background color &amp; opacity
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Button Text <span className="text-[#E95A35]">*</span>
                      </label>
                      <input
                        type="text"
                        value={btnText}
                        onChange={(e) => {
                          setBtnText(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Book an Appointment"
                        className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-2.5 text-[13.5px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                    </div>

                    <div>
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Button Link <span className="text-[#E95A35]">*</span>
                      </label>
                      <input
                        type="text"
                        value={btnLink}
                        onChange={(e) => {
                          setBtnLink(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. /booking"
                        className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-2.5 text-[13.5px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                    </div>
                  </div>

                  {/* Button Background Color Picker */}
                  <div>
                    <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                      Button Background Color
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="relative flex items-center gap-2 rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] p-1.5 pr-3 shadow-inner">
                        <input
                          type="color"
                          value={btnColor}
                          onChange={(e) => {
                            setBtnColor(e.target.value);
                            setIsDirty(true);
                          }}
                          className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                          title="Choose button color"
                        />
                        <span className="font-mono text-[13px] font-bold uppercase text-[#1F6878]">
                          {btnColor}
                        </span>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {BUTTON_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => {
                              setBtnColor(preset.value);
                              setIsDirty(true);
                            }}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                              btnColor.toLowerCase() === preset.value.toLowerCase()
                                ? "border-[#E95A35] bg-[#E4F0F2] text-[#E95A35] shadow-sm"
                                : "border-[#1F6878]/15 bg-white text-[#707574] hover:border-[#1F6878]/35"
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: preset.value }}
                            />
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Button Background Opacity Slider */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Button Background Opacity
                      </label>
                      <span className="rounded-full bg-[#E4F0F2] px-2.5 py-0.5 font-mono text-[12px] font-bold text-[#E95A35]">
                        {btnOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={btnOpacity}
                      onChange={(e) => {
                        setBtnOpacity(Number(e.target.value));
                        setIsDirty(true);
                      }}
                      className="mt-2 w-full accent-[#E95A35] cursor-pointer"
                    />
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] text-[#707574]">
                        Button text &amp; icon remain 100% sharp and fully visible.
                      </span>
                      {/* Live button miniature preview */}
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: previewBtnBg }}
                      >
                        <CalendarDays className="h-3 w-3" />
                        {btnText || "Button Preview"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: HERO BANNER IMAGE (FOREGROUND RIGHT-SIDE) */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#1F6878]">
                        2. Hero Banner Image (Foreground) <span className="text-[#E95A35]">*</span>
                      </h2>
                      <p className="text-[12px] text-[#707574]">
                        Displayed as a separate foreground image on the right side
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#1F6878]/20 bg-[#E4F0F2] px-2.5 py-1 text-[10.5px] font-bold text-[#1F6878]">
                    Rec: 800 × 800 px
                  </span>
                </div>

                <div className="mt-5">
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleHeroImageSelect}
                    className="hidden"
                  />

                  {heroImage ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3.5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative aspect-[1.32/1] w-full max-w-[210px] overflow-hidden rounded-xl border border-white/80 shadow-md">
                          <img
                            src={previewHeroImage}
                            alt="Hero foreground visual"
                            className="h-full w-full object-cover object-center"
                          />
                          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-2 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur">
                            Foreground Image
                          </span>
                        </div>

                        <div className="flex-1 space-y-2">
                          <p className="text-[13px] font-bold text-[#1F6878]">
                            Hero Image (Foreground)
                          </p>
                          <p className="break-all font-mono text-[11px] text-[#707574]">
                            {heroImage}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => heroFileInputRef.current?.click()}
                              disabled={uploadingHero}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F6878]/25 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1F6878] shadow-sm transition hover:bg-[#E4F0F2] disabled:opacity-50"
                            >
                              {uploadingHero ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1F6878]" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5 text-[#1F6878]" />
                              )}
                              Change Image
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHeroImage("");
                                setIsDirty(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove Image
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => heroFileInputRef.current?.click()}
                      className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1F6878]/25 bg-[#F5F2EB] p-8 text-center transition hover:border-[#1F6878] hover:bg-[#E4F0F2]/50"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878] group-hover:bg-[#E4F0F2] group-hover:text-[#E95A35]">
                        {uploadingHero ? (
                          <Loader2 className="h-6 w-6 animate-spin text-[#1F6878]" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>
                      <p className="mt-3 text-[13px] font-bold text-[#1F6878]">
                        Upload Hero Image (Foreground)
                      </p>
                      <p className="mt-1 text-[11.5px] text-[#707574]">
                        Recommended size: 800 × 800 px (PNG, JPG, WebP)
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHeroImage(DEFAULT_HERO_CONTENT.heroImage);
                          setIsDirty(true);
                        }}
                        className="mt-3 text-[11.5px] font-semibold text-[#E95A35] underline hover:text-[#D14824]"
                      >
                        or use default clinic visual
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: BACKGROUND IMAGE (FULL-WIDTH) */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#1F6878]">
                        3. Background Image (Full-Width) <span className="text-[#E95A35]">*</span>
                      </h2>
                      <p className="text-[12px] text-[#707574]">
                        Full-section background behind the hero content
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#1F6878]/20 bg-[#E4F0F2] px-2.5 py-1 text-[10.5px] font-bold text-[#1F6878]">
                    Rec: 1920 × 1080 px
                  </span>
                </div>

                <div className="mt-5">
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgImageSelect}
                    className="hidden"
                  />

                  {backgroundImage ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3.5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative aspect-[16/9] w-full max-w-[210px] overflow-hidden rounded-xl border border-white/80 shadow-md">
                          <img
                            src={previewBgImage}
                            alt="Hero background clinic interior"
                            className="h-full w-full object-cover object-center"
                          />
                          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-2 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur">
                            Background Image
                          </span>
                        </div>

                        <div className="flex-1 space-y-2">
                          <p className="text-[13px] font-bold text-[#1F6878]">
                            Background Image (Full-Width)
                          </p>
                          <p className="break-all font-mono text-[11px] text-[#707574]">
                            {backgroundImage}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => bgFileInputRef.current?.click()}
                              disabled={uploadingBg}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F6878]/25 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1F6878] shadow-sm transition hover:bg-[#E4F0F2] disabled:opacity-50"
                            >
                              {uploadingBg ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1F6878]" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5 text-[#1F6878]" />
                              )}
                              Change Image
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBackgroundImage("");
                                setIsDirty(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove Image
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => bgFileInputRef.current?.click()}
                      className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1F6878]/25 bg-[#F5F2EB] p-8 text-center transition hover:border-[#1F6878] hover:bg-[#E4F0F2]/50"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878] group-hover:bg-[#E4F0F2] group-hover:text-[#E95A35]">
                        {uploadingBg ? (
                          <Loader2 className="h-6 w-6 animate-spin text-[#1F6878]" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>
                      <p className="mt-3 text-[13px] font-bold text-[#1F6878]">
                        Upload Background Image (Full-Width)
                      </p>
                      <p className="mt-1 text-[11.5px] text-[#707574]">
                        Recommended size: 1920 × 1080 px (PNG, JPG, WebP)
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBackgroundImage(DEFAULT_HERO_CONTENT.backgroundImage);
                          setIsDirty(true);
                        }}
                        className="mt-3 text-[11.5px] font-semibold text-[#E95A35] underline hover:text-[#D14824]"
                      >
                        or use default interior background
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: BACKGROUND OVERLAY & OPACITY */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7 lg:col-span-2">
                <div className="flex items-center gap-2.5 border-b border-[#E4F0F2] pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1F6878]">
                      4. Background Overlay &amp; Opacity
                    </h2>
                    <p className="text-[12px] text-[#707574]">
                      Adjust the overlay transparency to improve text readability. Applies only to the background overlay, NOT to the entire hero section.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Overlay Color Picker */}
                  <div>
                    <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                      Background Overlay Color
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="relative flex items-center gap-2 rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] p-1.5 pr-3 shadow-inner">
                        <input
                          type="color"
                          value={overlayColor}
                          onChange={(e) => {
                            setOverlayColor(e.target.value);
                            setIsDirty(true);
                          }}
                          className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                          title="Choose overlay color"
                        />
                        <span className="font-mono text-[13px] font-bold uppercase text-[#1F6878]">
                          {overlayColor}
                        </span>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {OVERLAY_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => {
                              setOverlayColor(preset.value);
                              setIsDirty(true);
                            }}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                              overlayColor.toLowerCase() === preset.value.toLowerCase()
                                ? "border-[#1F6878] bg-[#E4F0F2] text-[#1F6878] shadow-sm"
                                : "border-[#1F6878]/15 bg-white text-[#707574] hover:border-[#1F6878]/35"
                            }`}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: preset.value }}
                            />
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-[11.5px] text-[#707574]">
                      White or ivory creates a bright, airy medical atmosphere. Dark teal creates a dramatic luxury aesthetic.
                    </p>
                  </div>

                  {/* Overlay Opacity Slider */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Background Overlay Opacity
                      </label>
                      <span className="rounded-full bg-[#E4F0F2] px-3 py-1 font-mono text-[13px] font-bold text-[#1F6878]">
                        {overlayOpacity}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={overlayOpacity}
                      onChange={(e) => {
                        setOverlayOpacity(Number(e.target.value));
                        setIsDirty(true);
                      }}
                      className="mt-3 w-full accent-[#1F6878] cursor-pointer"
                    />

                    <div className="mt-3 flex items-center justify-between text-[11.5px] text-[#707574]">
                      <span>0% (Transparent)</span>
                      <span className="font-semibold text-[#1F6878]">
                        Current: {overlayOpacity}%
                      </span>
                      <span>100% (Solid Color)</span>
                    </div>

                    <div className="mt-3 rounded-lg border border-[#1F6878]/20 bg-[#E4F0F2] p-2.5 text-[11.5px] text-[#1F6878]">
                      <strong>Targeted Transparency:</strong> Opacity applies strictly to the background overlay layer. The heading, description, foreground hero image, and CTA button always stay 100% crisp and readable without transparency.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: LIVE HERO PREVIEW */}
            <div
              ref={previewSectionRef}
              className="mt-12 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F6878]/10 bg-[#F5F2EB] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#E4F0F2] text-[#E95A35]">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#1F6878]">
                      6. Live Hero Preview
                    </h3>
                    <p className="text-[12px] text-[#707574]">
                      Real-time interactive rendering of the homepage hero banner showing full-width background, adjustable overlay, foreground image, heading, description, and CTA button.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Instant Live Preview
                  </span>
                </div>
              </div>

              {/* SIMULATED HOMEPAGE HERO CONTAINER */}
              <div className="relative isolate w-full min-h-[580px] lg:min-h-[660px] overflow-hidden border-b border-[#1F6878]/15 bg-[#F5F2EB] p-6 sm:p-10 lg:p-14 flex items-center"
                style={{
                  backgroundImage: previewBgImage ? `url(${previewBgImage})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Background Overlay Layer with dynamic color & opacity */}
                <div
                  className="absolute inset-0 -z-10 pointer-events-none transition-all duration-200"
                  style={{
                    backgroundColor: overlayColor,
                    opacity: overlayOpacity / 100,
                  }}
                />

                <div className="relative z-10 grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
                  {/* Left Side Content Preview */}
                  <div className="max-w-[580px]">
                    {/* Intro badge */}
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#dce4e5] bg-white/95 px-3.5 py-1 text-[11px] font-semibold text-[#1F6878] shadow-sm backdrop-blur">
                      <span className="h-2 w-2 rounded-full bg-[#1F6878]" />
                      Complete Dental Care for Every Generation
                    </span>

                    {/* Main Headline */}
                    <h2 className="mt-4 font-sans text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#1F6878]">
                      {heading ? (
                        heading.includes("Expert Care") ? (
                          <>
                            {heading.split("Expert Care")[0]}
                            <span className="text-[#1F6878]">Expert Care</span>
                            {heading.split("Expert Care").slice(1).join("Expert Care")}
                          </>
                        ) : (
                          heading
                        )
                      ) : (
                        "Your Smile Deserves Expert Care. A Lifetime of Confidence"
                      )}
                    </h2>

                    {/* Supporting Description */}
                    <p className="mt-3.5 max-w-[520px] text-[13px] sm:text-[14px] leading-relaxed text-[#707574]">
                      {description || DEFAULT_HERO_CONTENT.description}
                    </p>

                    {/* Review rating */}
                    <div className="mt-4 flex items-center gap-2 text-[12.5px]">
                      <span className="flex items-center gap-0.5 text-[#f5a623]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </span>
                      <span className="font-bold text-[#1F6878]">4.8</span>
                      <span className="text-[#707574]">· 1.1k Google reviews</span>
                    </div>

                    {/* Experience pills */}
                    <div className="mt-3.5 flex flex-wrap gap-1.5 text-[10.5px] font-semibold text-[#1F6878]">
                      <span className="rounded-full border border-[#1F6878]/15 bg-white/95 px-2.5 py-0.5 shadow-sm">
                        8+ yrs experience
                      </span>
                      <span className="rounded-full border border-[#1F6878]/15 bg-white/95 px-2.5 py-0.5 shadow-sm">
                        18,000+ patients
                      </span>
                      <span className="rounded-full border border-[#1F6878]/15 bg-white/95 px-2.5 py-0.5 shadow-sm">
                        15+ specialists
                      </span>
                    </div>

                    {/* CTA Button Preview with configured background color & opacity */}
                    <div className="mt-6">
                      <span
                        className="inline-flex h-[48px] items-center gap-2.5 rounded-full px-6 text-[13.5px] font-bold text-white shadow-lg transition duration-200"
                        style={{
                          backgroundColor: previewBtnBg,
                        }}
                      >
                        <CalendarDays className="h-4 w-4" />
                        {btnText || "Book an appointment"}
                      </span>
                    </div>
                  </div>

                  {/* Right Side Visual Preview */}
                  <div className="relative mx-auto w-full max-w-[480px]">
                    {/* Ambient green glow */}
                    <div className="absolute -inset-4 rounded-[34px] bg-[#1F6878]/20 blur-3xl pointer-events-none" />

                    {/* Rounded Image Container */}
                    <div
                      className="relative aspect-[1.32/1] w-full overflow-hidden border border-white/70 bg-[#E4F0F2] shadow-[0_20px_50px_-15px_rgba(31,104,120,0.35)]"
                      style={{ borderRadius: "26px" }}
                    >
                      <img
                        src={previewHeroImage}
                        alt="Hero foreground visual"
                        className="h-full w-full object-cover object-center block"
                      />

                      {/* Top-Right Experience Badge */}
                      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 rounded-xl border border-white/20 bg-[#15191B]/90 px-3 py-1 text-white shadow-md backdrop-blur">
                        <span className="font-sans text-[16px] font-extrabold leading-none text-white">
                          12 +
                        </span>
                        <div className="text-left">
                          <span className="block text-[7.5px] font-bold uppercase tracking-wider text-white/60">
                            Years of
                          </span>
                          <span className="block text-[9px] font-bold leading-tight text-white">
                            Excellence
                          </span>
                        </div>
                      </div>

                      {/* Bottom-Left Review Badge */}
                      <div className="absolute bottom-3.5 left-3.5 z-20 flex items-center gap-2 rounded-xl border border-[#dce4e5] bg-white/95 px-3 py-2 shadow-md backdrop-blur">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#fff7e6] text-[#f5a623]">
                          <Star className="h-3.5 w-3.5 fill-current" />
                        </span>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-[#15191B]">
                              4.8 Rating
                            </span>
                            <span className="flex text-[#f5a623] text-[9px]">★★★★★</span>
                          </div>
                          <span className="block text-[8.5px] text-[#707574]">
                            1,100+ Verified Patient Reviews
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1F6878]/15 bg-white/95 p-4 backdrop-blur-md lg:left-[300px]">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes in Hero Banner
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1F6878]">
                  <Check className="h-4 w-4 text-[#1F6878]" />
                  All changes published &amp; up-to-date
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={scrollToPreview}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#1F6878]/25 bg-white px-4 text-[13px] font-semibold text-[#1F6878] transition hover:bg-[#E4F0F2]"
              >
                <Eye className="h-4 w-4 text-[#1F6878]" />
                Preview
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || uploadingHero || uploadingBg}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#E95A35] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
