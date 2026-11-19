"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Layout,
  Loader2,
  MousePointerClick,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Smartphone,
  Monitor,
  Star,
  Trash2,
  Type,
  Upload,
  Users,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  api,
  resolveApiAsset,
  type SiteContent,
} from "@/lib/api";
import {
  DEFAULT_HERO_SETTINGS,
  hexToRgba,
  parseHeroSectionSettings,
  serializeHeroSectionSettings,
  type HeroSectionSettings,
  type HeroVisibilitySettings,
} from "@/lib/hero-banner-config";

const OVERLAY_COLOR_PRESETS = [
  { label: "Pure White", value: "#ffffff" },
  { label: "Cream / Ivory", value: "#F5F2EB" },
  { label: "Pale Mint", value: "#E4F0F2" },
  { label: "Deep Teal", value: "#073B43" },
  { label: "Dark Slate", value: "#15191B" },
];

const BUTTON_COLOR_PRESETS = [
  { label: "Coral Accent", value: "#E95A35" },
  { label: "Deep Teal", value: "#073B43" },
  { label: "Teal Brand", value: "#087E8B" },
  { label: "WhatsApp Green", value: "#19B987" },
  { label: "Dark Slate", value: "#15191B" },
];

type SettingsTab =
  | "basic"
  | "branding"
  | "heading"
  | "buttons"
  | "stats"
  | "images"
  | "showcase"
  | "visibility";

export default function HeroBannersPage() {
  const [existingItem, setExistingItem] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("basic");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isDirty, setIsDirty] = useState(false);

  // Upload loaders
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  // Form State initialized to DEFAULT_HERO_SETTINGS
  const [form, setForm] = useState<HeroSectionSettings>({ ...DEFAULT_HERO_SETTINGS });

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load existing hero section from Cloudflare D1
  const loadHeroBanner = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: SiteContent[] }>("/api/admin/content?type=hero");
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length > 0) {
        const item = items[0];
        setExistingItem(item);
        const parsed = parseHeroSectionSettings(item);
        setForm(parsed);
      } else {
        setForm({ ...DEFAULT_HERO_SETTINGS });
      }
      setIsDirty(false);
    } catch (err) {
      toast.error("Failed to load hero banner settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHeroBanner();
  }, [loadHeroBanner]);

  const updateField = <K extends keyof HeroSectionSettings>(key: K, value: HeroSectionSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const updateVisibility = (key: keyof HeroVisibilitySettings, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, [key]: value },
    }));
    setIsDirty(true);
  };

  // Image Upload Handlers
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "hero" | "bg" | "before" | "after"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "hero") setUploadingHero(true);
    else if (type === "bg") setUploadingBg(true);
    else if (type === "before") setUploadingBefore(true);
    else if (type === "after") setUploadingAfter(true);

    try {
      const uploaded = await api.upload(file, "banners");
      if (type === "hero") {
        updateField("heroImage", uploaded.url);
        toast.success("Hero promotional image uploaded to Cloudflare R2!");
      } else if (type === "bg") {
        updateField("backgroundImage", uploaded.url);
        toast.success("Background image uploaded to Cloudflare R2!");
      } else if (type === "before") {
        updateField("showcaseBeforeImg", uploaded.url);
        toast.success("Showcase Before image uploaded!");
      } else if (type === "after") {
        updateField("showcaseAfterImg", uploaded.url);
        toast.success("Showcase After image uploaded!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      if (type === "hero") {
        setUploadingHero(false);
        if (heroFileInputRef.current) heroFileInputRef.current.value = "";
      } else if (type === "bg") {
        setUploadingBg(false);
        if (bgFileInputRef.current) bgFileInputRef.current.value = "";
      } else if (type === "before") {
        setUploadingBefore(false);
        if (beforeFileInputRef.current) beforeFileInputRef.current.value = "";
      } else if (type === "after") {
        setUploadingAfter(false);
        if (afterFileInputRef.current) afterFileInputRef.current.value = "";
      }
    }
  };

  // Save changes to backend
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving || uploadingHero || uploadingBg || uploadingBefore || uploadingAfter) return;

    if (!form.heading.trim()) {
      toast.error("Main Hero Heading is required.");
      return;
    }
    if (!form.primaryCtaLabel.trim()) {
      toast.error("Primary CTA button text is required.");
      return;
    }

    setSaving(true);
    try {
      const serializedConfig = serializeHeroSectionSettings(form);

      const payload = {
        type: "hero",
        title: form.heading.trim(),
        subtitle: form.clinicName.trim(),
        body: form.description.trim(),
        mediaUrl: form.heroImage.trim(),
        mobileMediaUrl: form.backgroundImage.trim(),
        ctaLabel: form.primaryCtaLabel.trim(),
        linkUrl: form.primaryCtaUrl.trim(),
        secondaryCtaLabel: form.secondaryCtaLabel.trim(),
        secondaryCtaUrl: form.secondaryCtaUrl.trim(),
        badgeText: form.badgeText.trim(),
        ratingScore: form.ratingScore.trim(),
        reviewCount: form.reviewCount.trim(),
        trustBadgeText: form.badgeExperience.trim(),
        beforeImage: form.showcaseBeforeImg.trim(),
        afterImage: form.showcaseAfterImg.trim(),
        seoDescription: serializedConfig,
        published: form.published,
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
      // Notify other tabs and homepage of site content update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("site-content-updated"));
      }
      toast.success("Hero Section saved and published to homepage!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hero banner.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Restore all hero section settings to clinic defaults? Unsaved edits will be replaced.")) {
      setForm({ ...DEFAULT_HERO_SETTINGS });
      setIsDirty(true);
      toast.success("Restored clinic default settings. Click 'Save & Publish' to persist.");
    }
  };

  // Live preview helpers
  const btnBackgroundColor =
    form.btnColor === DEFAULT_HERO_SETTINGS.btnColor
      ? "#E95A35"
      : hexToRgba(form.btnColor, form.btnOpacity / 100);

  const previewHeroImg = form.heroImage ? resolveApiAsset(form.heroImage) : DEFAULT_HERO_SETTINGS.heroImage;
  const previewBgImg = form.backgroundImage ? resolveApiAsset(form.backgroundImage) : DEFAULT_HERO_SETTINGS.backgroundImage;
  const isLogoOnly = Boolean(previewHeroImg.includes("logo") && !previewHeroImg.includes("promo"));

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "basic", label: "1. Basic Info", icon: Sliders },
    { id: "branding", label: "2. Clinic Branding", icon: Type },
    { id: "heading", label: "3. Heading & Text", icon: Layout },
    { id: "buttons", label: "4. Buttons & Links", icon: MousePointerClick },
    { id: "stats", label: "5. Statistics", icon: Users },
    { id: "images", label: "6. Hero Images", icon: ImageIcon },
    { id: "showcase", label: "7. Transformation", icon: Sparkles },
    { id: "visibility", label: "8. Visibility", icon: Eye },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F6878]/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#087E8B]">
              <Link to="/dashboard" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span>Website Management</span>
              <span>/</span>
              <span className="text-[#073B43]">Hero Section</span>
            </div>
            <h1 className="mt-1 font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-[#073B43]">
              Hero Section Management
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#707574]">
              Control the homepage hero identity, typography, statistics, visuals, and transformation showcase.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1F6878]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1F6878] hover:bg-[#F5F2EB] transition"
              title="Reset all fields to clinic defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Defaults</span>
            </button>

            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1F6878]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1F6878] hover:bg-[#F5F2EB] transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Homepage</span>
            </Link>

            <Button
              type="button"
              loading={saving}
              onClick={() => void handleSave()}
              className="bg-[#0E8A5E] hover:bg-[#0B6E4B] text-white shadow-sm px-5"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Publishing..." : isDirty ? "Save & Publish Changes *" : "Published"}</span>
            </Button>
          </div>
        </div>

        {/* Status Indicator Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-[#1F6878]/15 bg-[#E4F0F2]/70 px-4 py-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                form.published ? "bg-[#0E8A5E] animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-semibold text-[#073B43]">
              Status: {form.published ? "Live on Homepage" : "Draft (Hidden from Homepage)"}
            </span>
            {isDirty && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800 text-[10px]">
                Unsaved edits
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#707574]">Preview device:</span>
            <div className="inline-flex rounded-lg border border-[#1F6878]/20 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  previewDevice === "desktop" ? "bg-[#073B43] text-white" : "text-[#707574] hover:text-[#073B43]"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  previewDevice === "mobile" ? "bg-[#073B43] text-white" : "text-[#707574] hover:text-[#073B43]"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Form Editor (Left/Top) + Real-time Interactive Live Preview (Right/Bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Settings Form Container */}
          <div className="lg:col-span-7 space-y-5">
            {/* Tab Navigation Pill Bar */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[#1F6878]/15 bg-white p-1.5 shadow-xs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#073B43] text-white shadow-xs"
                        : "text-[#707574] hover:bg-[#F5F2EB] hover:text-[#073B43]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: Basic Information */}
            {activeTab === "basic" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-4 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">1. Basic Information</h3>
                  <p className="text-xs text-[#707574]">General hero display settings and publication status.</p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB]/60 p-3.5">
                  <div>
                    <label className="text-sm font-bold text-[#073B43]">Section Live Status</label>
                    <p className="text-xs text-[#707574]">When disabled, the hero section is hidden from the public website.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => updateField("published", e.target.checked)}
                    className="h-5 w-5 accent-[#0E8A5E] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#073B43] mb-1">
                    Small Introductory Label / Pill
                  </label>
                  <Input
                    value={form.badgeText}
                    onChange={(e) => updateField("badgeText", e.target.value)}
                    placeholder="e.g. COMPLETE DENTAL CARE FOR EVERY GENERATION"
                  />
                  <p className="mt-1 text-[11px] text-[#707574]">Displayed in an orange pill badge above the hero titles.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#073B43] mb-1">
                    Sub-caption / Footer Note (Below Statistics)
                  </label>
                  <Input
                    value={form.subCaption}
                    onChange={(e) => updateField("subCaption", e.target.value)}
                    placeholder="e.g. Caring for Coimbatore & Erode smiles since 2017 · Sri Saraswathi Dental Clinic"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Clinic Branding */}
            {activeTab === "branding" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-4 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">2. Clinic Branding</h3>
                  <p className="text-xs text-[#707574]">
                    The clinic name and tagline appear cleanly above the main hero headline without any background cards or borders.
                  </p>
                </div>

                <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs text-[#073B43]">
                  <strong>Design Note:</strong> The clinic name is rendered with medium-bold Deep Teal typography and the tagline with subtle teal typography directly above the main hero heading for a clean, premium dental aesthetic.
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#073B43] mb-1">
                    Clinic Name (Clean Typography)
                  </label>
                  <Input
                    value={form.clinicName}
                    onChange={(e) => updateField("clinicName", e.target.value)}
                    placeholder="e.g. Sri Saraswathi Dental Clinic"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#073B43] mb-1">
                    Clinic Tagline
                  </label>
                  <Input
                    value={form.clinicTagline}
                    onChange={(e) => updateField("clinicTagline", e.target.value)}
                    placeholder="e.g. Creating Healthy Smiles, Changing Lives."
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Hero Heading & Description */}
            {activeTab === "heading" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-4 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">3. Hero Heading & Description</h3>
                  <p className="text-xs text-[#707574]">The central hero headline and supportive paragraph.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#073B43] mb-1">
                    Main Hero Headline
                  </label>
                  <Input
                    value={form.heading}
                    onChange={(e) => updateField("heading", e.target.value)}
                    placeholder="e.g. Your Smile Deserves Expert Care. A Lifetime of Confidence."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#073B43] mb-1">
                    Supporting Hero Description
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    className="w-full rounded-xl border border-[#1F6878]/20 bg-white p-3 text-xs text-[#073B43] outline-none focus:border-[#087E8B] focus:ring-2 focus:ring-[#087E8B]/20"
                    placeholder="Provide a welcoming 2-3 sentence introduction to the clinic's comprehensive care..."
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Buttons & Links */}
            {activeTab === "buttons" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-4 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">4. Buttons & Links (CTAs)</h3>
                  <p className="text-xs text-[#707574]">Configure primary and secondary calls-to-action.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">
                      Primary CTA Button Label
                    </label>
                    <Input
                      value={form.primaryCtaLabel}
                      onChange={(e) => updateField("primaryCtaLabel", e.target.value)}
                      placeholder="e.g. Book a Visit"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">
                      Primary CTA Target URL
                    </label>
                    <Input
                      value={form.primaryCtaUrl}
                      onChange={(e) => updateField("primaryCtaUrl", e.target.value)}
                      placeholder="e.g. /booking"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">
                      Secondary CTA Button Label
                    </label>
                    <Input
                      value={form.secondaryCtaLabel}
                      onChange={(e) => updateField("secondaryCtaLabel", e.target.value)}
                      placeholder="e.g. Explore Treatments"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">
                      Secondary CTA Target URL
                    </label>
                    <Input
                      value={form.secondaryCtaUrl}
                      onChange={(e) => updateField("secondaryCtaUrl", e.target.value)}
                      placeholder="e.g. /treatments"
                    />
                  </div>
                </div>

                {/* Primary Button Styling */}
                <div className="border-t border-[#1F6878]/10 pt-4 space-y-3">
                  <label className="block text-xs font-bold text-[#073B43]">
                    Primary Button Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {BUTTON_COLOR_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => updateField("btnColor", p.value)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          form.btnColor.toLowerCase() === p.value.toLowerCase()
                            ? "border-[#073B43] bg-[#E4F0F2]"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: p.value }} />
                        <span>{p.label}</span>
                      </button>
                    ))}
                    <input
                      type="color"
                      value={form.btnColor}
                      onChange={(e) => updateField("btnColor", e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-200 p-0.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Statistics */}
            {activeTab === "stats" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-4 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">5. Statistics & Ratings</h3>
                  <p className="text-xs text-[#707574]">Manage the 3 clinic statistic badges and Google Review rating.</p>
                </div>

                {/* Statistic 1: Experience */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#1F6878]/15 p-3 bg-[#F5F2EB]/30">
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Metric 1: Value</label>
                    <Input
                      value={form.statExperienceValue}
                      onChange={(e) => updateField("statExperienceValue", e.target.value)}
                      placeholder="e.g. 8+ yrs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Metric 1: Label</label>
                    <Input
                      value={form.statExperienceLabel}
                      onChange={(e) => updateField("statExperienceLabel", e.target.value)}
                      placeholder="e.g. experience"
                    />
                  </div>
                </div>

                {/* Statistic 2: Patients */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#1F6878]/15 p-3 bg-[#F5F2EB]/30">
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Metric 2: Value</label>
                    <Input
                      value={form.statPatientsValue}
                      onChange={(e) => updateField("statPatientsValue", e.target.value)}
                      placeholder="e.g. 18,000+"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Metric 2: Label</label>
                    <Input
                      value={form.statPatientsLabel}
                      onChange={(e) => updateField("statPatientsLabel", e.target.value)}
                      placeholder="e.g. patients"
                    />
                  </div>
                </div>

                {/* Statistic 3: Specialists */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#1F6878]/15 p-3 bg-[#F5F2EB]/30">
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Metric 3: Value</label>
                    <Input
                      value={form.statSpecialistsValue}
                      onChange={(e) => updateField("statSpecialistsValue", e.target.value)}
                      placeholder="e.g. 15+"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Metric 3: Label</label>
                    <Input
                      value={form.statSpecialistsLabel}
                      onChange={(e) => updateField("statSpecialistsLabel", e.target.value)}
                      placeholder="e.g. specialists"
                    />
                  </div>
                </div>

                {/* Google Rating */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#1F6878]/15 p-3 bg-[#F5F2EB]/30">
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Google Rating Score</label>
                    <Input
                      value={form.ratingScore}
                      onChange={(e) => updateField("ratingScore", e.target.value)}
                      placeholder="e.g. 4.9"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#073B43]">Verified Reviews Count</label>
                    <Input
                      value={form.reviewCount}
                      onChange={(e) => updateField("reviewCount", e.target.value)}
                      placeholder="e.g. 449+"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: Hero Images */}
            {activeTab === "images" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-5 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">6. Hero Images & Overlays</h3>
                  <p className="text-xs text-[#707574]">Upload and manage the right-side visual and the full-width background.</p>
                </div>

                {/* Right Foreground Photo */}
                <div className="rounded-xl border border-[#1F6878]/15 p-4 space-y-3 bg-[#F5F2EB]/25">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#073B43]">Right-Side Promotional Photo (800×800)</h4>
                      <p className="text-[11px] text-[#707574]">Clinical treatment photo, doctor portrait, or showcase graphic.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={heroFileInputRef}
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "hero")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => heroFileInputRef.current?.click()}
                        disabled={uploadingHero}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#073B43] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#05292F] transition disabled:opacity-50"
                      >
                        {uploadingHero ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        <span>{uploadingHero ? "Uploading..." : "Replace Photo"}</span>
                      </button>
                    </div>
                  </div>

                  {form.heroImage && (
                    <div className="relative aspect-[16/9] w-full max-w-[280px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      <img
                        src={resolveApiAsset(form.heroImage)}
                        alt="Hero foreground visual"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#073B43]">Experience Badge Text</label>
                      <Input
                        value={form.badgeExperience}
                        onChange={(e) => updateField("badgeExperience", e.target.value)}
                        placeholder="e.g. 12 +"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#073B43]">Badge Subtitle</label>
                      <Input
                        value={form.badgeExperienceLabel}
                        onChange={(e) => updateField("badgeExperienceLabel", e.target.value)}
                        placeholder="e.g. Years of Excellence"
                      />
                    </div>
                  </div>
                </div>

                {/* Full-width Background Image & Overlay */}
                <div className="rounded-xl border border-[#1F6878]/15 p-4 space-y-3 bg-[#F5F2EB]/25">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#073B43]">Full-Width Background Image (1920×1080)</h4>
                      <p className="text-[11px] text-[#707574]">Clinic interior texture or architectural view.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={bgFileInputRef}
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "bg")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bgFileInputRef.current?.click()}
                        disabled={uploadingBg}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#073B43] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#05292F] transition disabled:opacity-50"
                      >
                        {uploadingBg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        <span>{uploadingBg ? "Uploading..." : "Replace Background"}</span>
                      </button>
                    </div>
                  </div>

                  {form.backgroundImage && (
                    <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                      <img
                        src={resolveApiAsset(form.backgroundImage)}
                        alt="Hero background texture"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Overlay Color & Opacity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#073B43] mb-1">
                        Overlay Color
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {OVERLAY_COLOR_PRESETS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => updateField("overlayColor", p.value)}
                            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${
                              form.overlayColor.toLowerCase() === p.value.toLowerCase()
                                ? "border-[#073B43] bg-[#E4F0F2]"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: p.value }} />
                            <span>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-[#073B43]">
                        <span>Overlay Opacity</span>
                        <span>{form.overlayOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={form.overlayOpacity}
                        onChange={(e) => updateField("overlayOpacity", Number(e.target.value))}
                        className="w-full cursor-pointer accent-[#087E8B] mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: Transformation Showcase */}
            {activeTab === "showcase" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-4 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">7. Transformation Showcase</h3>
                  <p className="text-xs text-[#707574]">
                    The interactive Before & After smile comparison card displayed on the right-side hero column.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">Showcase Heading</label>
                    <Input
                      value={form.showcaseHeading}
                      onChange={(e) => updateField("showcaseHeading", e.target.value)}
                      placeholder="e.g. REAL SMILES. CONFIDENT RESULTS."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">Showcase Subtitle</label>
                    <Input
                      value={form.showcaseSubtitle}
                      onChange={(e) => updateField("showcaseSubtitle", e.target.value)}
                      placeholder="e.g. Your Smile Transformation Starts Here."
                    />
                  </div>
                </div>

                {/* Before & After Image Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Before Image */}
                  <div className="rounded-xl border border-[#1F6878]/15 p-3.5 space-y-2 bg-[#F5F2EB]/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#073B43]">Before Image</span>
                      <input
                        type="file"
                        ref={beforeFileInputRef}
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "before")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => beforeFileInputRef.current?.click()}
                        disabled={uploadingBefore}
                        className="rounded bg-[#073B43] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#05292F]"
                      >
                        {uploadingBefore ? "..." : "Upload Before"}
                      </button>
                    </div>

                    {form.showcaseBeforeImg && (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={resolveApiAsset(form.showcaseBeforeImg)}
                          alt="Before showcase"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-[#707574]">Before Badge Label</label>
                      <Input
                        value={form.showcaseBeforeLabel}
                        onChange={(e) => updateField("showcaseBeforeLabel", e.target.value)}
                        placeholder="BEFORE"
                      />
                    </div>
                  </div>

                  {/* After Image */}
                  <div className="rounded-xl border border-[#1F6878]/15 p-3.5 space-y-2 bg-[#F5F2EB]/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#073B43]">After Image</span>
                      <input
                        type="file"
                        ref={afterFileInputRef}
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "after")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => afterFileInputRef.current?.click()}
                        disabled={uploadingAfter}
                        className="rounded bg-[#087E8B] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#066570]"
                      >
                        {uploadingAfter ? "..." : "Upload After"}
                      </button>
                    </div>

                    {form.showcaseAfterImg && (
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={resolveApiAsset(form.showcaseAfterImg)}
                          alt="After showcase"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-[#707574]">After Badge Label</label>
                      <Input
                        value={form.showcaseAfterLabel}
                        onChange={(e) => updateField("showcaseAfterLabel", e.target.value)}
                        placeholder="AFTER"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">Treatment Tag</label>
                    <Input
                      value={form.showcaseTreatment}
                      onChange={(e) => updateField("showcaseTreatment", e.target.value)}
                      placeholder="e.g. Smile Makeover"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#073B43] mb-1">Showcase Link URL</label>
                    <Input
                      value={form.showcaseLink}
                      onChange={(e) => updateField("showcaseLink", e.target.value)}
                      placeholder="e.g. /smile-gallery"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: Visibility Settings */}
            {activeTab === "visibility" && (
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-5 space-y-3 shadow-xs">
                <div className="border-b border-[#1F6878]/10 pb-3">
                  <h3 className="font-sans text-base font-bold text-[#073B43]">8. Element Visibility Toggles</h3>
                  <p className="text-xs text-[#707574]">Turn individual hero section elements on or off in real time.</p>
                </div>

                {[
                  { key: "showBadge", label: "Introductory Badge / Label", desc: "Top orange pill tag" },
                  { key: "showClinicName", label: "Clinic Name", desc: "Clean deep teal typography above heading" },
                  { key: "showTagline", label: "Clinic Tagline", desc: "Subtle teal tagline below clinic name" },
                  { key: "showHeading", label: "Main Hero Headline", desc: "Large primary heading" },
                  { key: "showDescription", label: "Hero Description Paragraph", desc: "Detailed supportive text" },
                  { key: "showRatings", label: "Google Ratings & Star Bar", desc: "4.8/4.9 star rating and review count" },
                  { key: "showStats", label: "Statistic Badges", desc: "Experience, Patients, Specialists cards" },
                  { key: "showPrimaryCta", label: "Primary CTA Button", desc: "'Book a Visit' main button" },
                  { key: "showSecondaryCta", label: "Secondary CTA Button", desc: "'Explore Treatments' outline button" },
                  { key: "showHeroImage", label: "Right Promotional Image Card", desc: "Visual container with experience & rating badges" },
                  { key: "showShowcase", label: "Transformation Showcase", desc: "Before and After comparison slider card" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50/70 transition"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#073B43]">{item.label}</p>
                      <p className="text-[11px] text-[#707574]">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.visibility[item.key as keyof HeroVisibilitySettings]}
                      onChange={(e) =>
                        updateVisibility(item.key as keyof HeroVisibilitySettings, e.target.checked)
                      }
                      className="h-4.5 w-4.5 accent-[#087E8B] cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div className="lg:col-span-5 sticky top-20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#073B43] flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#087E8B]" /> Live Real-Time Preview
              </span>
              <span className="text-[11px] text-[#707574]">
                Matches public homepage rendering
              </span>
            </div>

            <div
              ref={previewRef}
              className={`rounded-2xl border border-[#1F6878]/20 bg-[#F5F2EB] shadow-md overflow-hidden transition-all duration-300 relative ${
                previewDevice === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
              }`}
              style={{
                backgroundImage: `url(${previewBgImg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Background Overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-300"
                style={{
                  backgroundColor: form.overlayColor,
                  opacity: form.overlayOpacity / 100,
                }}
              />

              {/* Preview Content Area */}
              <div className="relative z-10 p-5 space-y-3.5">
                {/* 1. Badge */}
                {form.visibility.showBadge && form.badgeText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E95A35] bg-[#E95A35] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    {form.badgeText}
                  </span>
                )}

                {/* 2. Clinic Name and Tagline: NO orange border, NO rectangular container! */}
                {(form.visibility.showClinicName || form.visibility.showTagline) && (
                  <div className="text-left">
                    {form.visibility.showClinicName && (
                      <p className="font-sans text-[15px] font-bold tracking-tight text-[#073B43] leading-snug">
                        {form.clinicName || "Sri Saraswathi Dental Clinic"}
                      </p>
                    )}
                    {form.visibility.showTagline && (
                      <p className="text-[10.5px] font-medium tracking-wide text-[#087E8B]">
                        {form.clinicTagline || "Creating Healthy Smiles, Changing Lives."}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Heading */}
                {form.visibility.showHeading && (
                  <h2 className="font-sans text-[18px] sm:text-[22px] font-extrabold leading-tight text-[#1F6878] tracking-tight">
                    {form.heading}
                  </h2>
                )}

                {/* 4. Description */}
                {form.visibility.showDescription && (
                  <p className="text-[11px] leading-relaxed text-[#707574] line-clamp-3">
                    {form.description}
                  </p>
                )}

                {/* 5. Rating */}
                {form.visibility.showRatings && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="flex text-[#FB8500] text-[10px]">★★★★★</span>
                    <span className="font-bold text-[#1F6878]">{form.ratingScore}</span>
                    <span className="text-[#707574]">· {form.reviewCount} Google reviews</span>
                  </div>
                )}

                {/* 6. Stats Badges */}
                {form.visibility.showStats && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-xl border border-white/80 bg-white/95 px-2.5 py-1 shadow-xs text-left">
                      <span className="block font-sans text-[10px] font-bold text-[#073B43]">{form.statExperienceValue}</span>
                      <span className="block text-[8px] text-[#707574]">{form.statExperienceLabel}</span>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/95 px-2.5 py-1 shadow-xs text-left">
                      <span className="block font-sans text-[10px] font-bold text-[#073B43]">{form.statPatientsValue}</span>
                      <span className="block text-[8px] text-[#707574]">{form.statPatientsLabel}</span>
                    </div>
                    <div className="rounded-xl border border-white/80 bg-white/95 px-2.5 py-1 shadow-xs text-left">
                      <span className="block font-sans text-[10px] font-bold text-[#073B43]">{form.statSpecialistsValue}</span>
                      <span className="block text-[8px] text-[#707574]">{form.statSpecialistsLabel}</span>
                    </div>
                  </div>
                )}

                {/* 7. Action Buttons */}
                {(form.visibility.showPrimaryCta || form.visibility.showSecondaryCta) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {form.visibility.showPrimaryCta && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: btnBackgroundColor }}
                      >
                        <CalendarDays className="h-3 w-3" />
                        {form.primaryCtaLabel}
                      </span>
                    )}
                    {form.visibility.showSecondaryCta && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#073B43] px-3.5 py-2 text-[11px] font-bold text-[#073B43]">
                        {form.secondaryCtaLabel} <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                )}

                {/* 8. Right Promotional Preview */}
                {form.visibility.showHeroImage && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/30 shadow-sm mt-3">
                    <img
                      src={previewHeroImg}
                      alt="Preview promotional card"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 right-2 rounded-full bg-[#1F6878] px-2.5 py-0.5 text-white text-[9px] font-bold">
                      {form.badgeExperience} {form.badgeExperienceLabel}
                    </div>
                    <div className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-0.5 text-[9px] font-bold text-[#073B43] shadow-xs flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-[#FB8500] text-[#FB8500]" />
                      <span>{form.cardRatingScore}</span>
                    </div>
                  </div>
                )}

                {/* 9. Transformation Showcase Preview */}
                {form.visibility.showShowcase && (
                  <div className="rounded-xl border border-[#E7E2DA] bg-[#FDFCF9] p-3 text-center space-y-2">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#087E8B]">
                      TRANSFORMATION SHOWCASE
                    </span>
                    <p className="text-[10px] font-black text-[#073B43]">{form.showcaseHeading}</p>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="relative flex-1 aspect-[1.1/1] overflow-hidden rounded-lg bg-[#E4F0F2]">
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-[#073B43] px-2 py-0.2 text-[6px] font-bold text-white">
                          {form.showcaseBeforeLabel}
                        </span>
                        <img
                          src={resolveApiAsset(form.showcaseBeforeImg)}
                          alt="Before"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <ArrowRight className="h-3 w-3 text-[#FB8500] shrink-0" />
                      <div className="relative flex-1 aspect-[1.1/1] overflow-hidden rounded-lg bg-[#E4F0F2]">
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-[#087E8B] px-2 py-0.2 text-[6px] font-bold text-white">
                          {form.showcaseAfterLabel}
                        </span>
                        <img
                          src={resolveApiAsset(form.showcaseAfterImg)}
                          alt="After"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
