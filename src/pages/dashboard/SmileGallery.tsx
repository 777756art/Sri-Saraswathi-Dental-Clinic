import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  api,
  resolveApiAsset,
  type BeforeAfterSectionSettings,
  DEFAULT_BEFORE_AFTER_SETTINGS,
  type SiteContent,
} from "@/lib/api";
import { SITE_CONTENT_SYNC_CHANNEL } from "@/lib/reels";

export default function SmileGalleryPage() {
  const [settings, setSettings] = useState<BeforeAfterSectionSettings>(DEFAULT_BEFORE_AFTER_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<BeforeAfterSectionSettings>(DEFAULT_BEFORE_AFTER_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [_loading, setLoading] = useState(true);

  // Patient Cases State
  const [cases, setCases] = useState<SiteContent[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  // Dedicated Hero Image Upload states
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingHeroMobile, setUploadingHeroMobile] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);

  // Modal State for Patient Transformation (Section C)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<SiteContent | null>(null);
  const [savingCase, setSavingCase] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    badgeText: "",
    subtitle: "",
    beforeImage: "",
    afterImage: "",
    patientConsent: true,
    homepageHighlight: true,
    published: true,
  });

  // Load Settings and Cases on Mount
  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, contentRes] = await Promise.all([
        api.getAdminBeforeAfterSettings().catch(() => ({ settings: DEFAULT_BEFORE_AFTER_SETTINGS })),
        api.get<{ items: SiteContent[] }>("/api/admin/content?type=gallery").catch(() => ({ items: [] })),
      ]);

      const fetchedSettings = settingsRes.settings || DEFAULT_BEFORE_AFTER_SETTINGS;
      setSettings(fetchedSettings);
      setInitialSettings(fetchedSettings);

      const items = Array.isArray(contentRes.items) ? contentRes.items : [];
      setCases(items);
    } catch (err) {
      console.error("Failed to load before/after data:", err);
      toast.error("Could not load Before & After settings.");
    } finally {
      setLoading(false);
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Section A & B Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await api.updateBeforeAfterSettings(settings);
      setSettings(res.settings);
      setInitialSettings(res.settings);

      // Broadcast changes so homepage updates immediately
      try {
        const bc = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        bc.postMessage({ type: "before_after_settings_updated", timestamp: Date.now() });
        bc.close();
      } catch {
        // BroadcastChannel optional fallback
      }

      toast.success("Homepage Before & After display settings saved!");
    } catch (err) {
      console.error("Save settings error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCancelSettings = () => {
    setSettings(initialSettings);
    toast("Settings reverted to last saved state.");
  };

  // Dedicated Hero Image Uploads (Section B)
  const handleHeroUpload = async (file: File, isMobile = false) => {
    if (!file) return;
    try {
      if (isMobile) setUploadingHeroMobile(true);
      else setUploadingHero(true);

      const uploaded = await api.upload(file, "banners");
      if (isMobile) {
        setSettings((prev) => ({ ...prev, heroImageMobile: uploaded.url }));
        toast.success("Mobile hero promotional image uploaded.");
      } else {
        setSettings((prev) => ({ ...prev, heroImage: uploaded.url }));
        toast.success("Hero promotional image uploaded.");
      }
    } catch (err) {
      console.error("Hero image upload error:", err);
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      if (isMobile) setUploadingHeroMobile(false);
      else setUploadingHero(false);
    }
  };

  // Modal Actions (Section C)
  const openNewCaseModal = () => {
    setEditingCase(null);
    setForm({
      title: "",
      badgeText: "Clinical Restoration",
      subtitle: "",
      beforeImage: "",
      afterImage: "",
      patientConsent: true,
      homepageHighlight: true,
      published: true,
    });
    setModalOpen(true);
  };

  const openEditCaseModal = (item: SiteContent) => {
    setEditingCase(item);
    setForm({
      title: item.title || "",
      badgeText: item.badgeText || "Clinical Restoration",
      subtitle: item.subtitle || item.excerpt || "",
      beforeImage: item.beforeImage || item.before_image || "",
      afterImage: item.afterImage || item.after_image || item.mediaUrl || "",
      patientConsent: Boolean(item.patientConsent),
      homepageHighlight: Boolean(item.homepageHighlight),
      published: Boolean(item.published),
    });
    setModalOpen(true);
  };

  const handlePatientImageUpload = async (file: File, field: "beforeImage" | "afterImage") => {
    if (!file) return;
    try {
      if (field === "beforeImage") setUploadingBefore(true);
      else setUploadingAfter(true);

      const uploaded = await api.upload(file, "gallery");
      setForm((prev) => ({ ...prev, [field]: uploaded.url }));
      toast.success(`${field === "beforeImage" ? "Before" : "After"} photo uploaded.`);
    } catch (err) {
      console.error("Patient image upload error:", err);
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      if (field === "beforeImage") setUploadingBefore(false);
      else setUploadingAfter(false);
    }
  };

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a treatment name or caption.");
      return;
    }
    if (!form.beforeImage || !form.afterImage) {
      toast.error("Both BEFORE and AFTER photographs are required.");
      return;
    }

    try {
      setSavingCase(true);
      const payload = {
        type: "gallery" as const,
        title: form.title.trim(),
        badgeText: form.badgeText.trim() || "Clinical Restoration",
        subtitle: form.subtitle.trim(),
        beforeImage: form.beforeImage,
        afterImage: form.afterImage,
        mediaUrl: form.afterImage, // For backwards compatibility
        patientConsent: form.patientConsent ? 1 : 0,
        homepageHighlight: form.homepageHighlight ? 1 : 0,
        published: form.published ? 1 : 0,
      };

      if (editingCase?.id) {
        await api.patch(`/api/admin/content/${editingCase.id}`, payload);
        toast.success("Transformation case updated.");
      } else {
        await api.post("/api/admin/content", payload);
        toast.success("New transformation case created.");
      }

      setModalOpen(false);
      await loadData();

      // Broadcast changes
      try {
        const bc = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        bc.postMessage({ type: "site_content_updated", timestamp: Date.now() });
        bc.close();
      } catch {}
    } catch (err) {
      console.error("Save case error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save transformation case.");
    } finally {
      setSavingCase(false);
    }
  };

  const handleDeleteCase = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this patient transformation case?")) return;
    try {
      await api.delete(`/api/admin/content/${id}`);
      setCases((prev) => prev.filter((c) => c.id !== id));
      toast.success("Transformation case removed.");
      try {
        const bc = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        bc.postMessage({ type: "site_content_updated", timestamp: Date.now() });
        bc.close();
      } catch {}
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete case.");
    }
  };

  const handleToggleHomepageHighlight = async (item: SiteContent) => {
    try {
      const nextVal = !item.homepageHighlight;
      await api.patch(`/api/admin/content/${item.id}`, {
        homepageHighlight: nextVal ? 1 : 0,
      });
      setCases((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, homepageHighlight: nextVal } : c))
      );
      toast.success(
        nextVal
          ? "Case added to Homepage Hero showcase."
          : "Case removed from Homepage Hero showcase."
      );
      try {
        const bc = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        bc.postMessage({ type: "site_content_updated", timestamp: Date.now() });
        bc.close();
      } catch {}
    } catch (err) {
      toast.error("Failed to update homepage selection.");
    }
  };

  const handleTogglePublished = async (item: SiteContent) => {
    try {
      const nextVal = !item.published;
      await api.patch(`/api/admin/content/${item.id}`, {
        published: nextVal ? 1 : 0,
      });
      setCases((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, published: nextVal } : c))
      );
      toast.success(nextVal ? "Case published." : "Case unpublished (Draft).");
      try {
        const bc = new BroadcastChannel(SITE_CONTENT_SYNC_CHANNEL);
        bc.postMessage({ type: "site_content_updated", timestamp: Date.now() });
        bc.close();
      } catch {}
    } catch (err) {
      toast.error("Failed to update publish status.");
    }
  };

  const hasUnsavedSettings =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-16">
        {/* Top Header & Action Controls */}
        <div className="flex flex-col gap-4 border-b border-[#1F6878]/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#073B43] text-white shadow-sm">
                <Sparkles className="h-5 w-5 text-[#FB8500]" />
              </span>
              <h1 className="font-sans text-2xl font-extrabold tracking-tight text-[#073B43] sm:text-3xl">
                Before &amp; After Management
              </h1>
            </div>
            <p className="mt-1 text-[13px] text-[#707574]">
              Control homepage hero transformation showcase display, hero image, and patient-consented Before &amp; After photographs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/?preview=hero"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#1F6878]/25 bg-white px-4 text-xs font-bold text-[#073B43] shadow-sm transition hover:bg-[#FAF8F4]"
            >
              <Eye className="h-4 w-4" />
              <span>Preview Homepage</span>
              <ExternalLink className="h-3 w-3 text-[#707574]" />
            </Link>

            <Button
              type="button"
              variant="outline"
              disabled={!hasUnsavedSettings || savingSettings}
              onClick={handleCancelSettings}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={!hasUnsavedSettings || savingSettings}
              onClick={handleSaveSettings}
              className="bg-[#073B43] text-white hover:bg-[#073B43]/90"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* SECTION A – Homepage Display Settings */}
        <section
          className="rounded-[24px] border border-[#1F6878]/20 bg-white p-6 shadow-[0_12px_32px_-16px_rgba(31,104,120,0.14)]"
          aria-labelledby="section-a-heading"
        >
          <div className="border-b border-[#1F6878]/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087E8B]">
                  Section A
                </span>
                <h2 id="section-a-heading" className="text-lg font-extrabold text-[#073B43]">
                  Homepage Display Settings
                </h2>
                <p className="text-xs text-[#707574]">
                  Manage the visibility and copy of the Before &amp; After component in the right column of the homepage hero.
                </p>
              </div>

              {/* Show / Hide Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#073B43]">
                  {settings.enabled ? "Section Enabled (ON)" : "Section Hidden (OFF)"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.enabled}
                  onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#073B43] ${
                    settings.enabled ? "bg-[#19B987]" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Section Heading
              </label>
              <Input
                type="text"
                value={settings.heading}
                onChange={(e) => setSettings((prev) => ({ ...prev, heading: e.target.value }))}
                placeholder="REAL SMILES. CONFIDENT RESULTS."
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-[#707574]">
                Appears in bold uppercase above the transformation cards.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Section Subtitle
              </label>
              <Input
                type="text"
                value={settings.subtitle}
                onChange={(e) => setSettings((prev) => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Your Smile Transformation Starts Here."
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-[#707574]">
                Supporting guidance displayed below the heading.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Display Position
              </label>
              <div className="mt-1.5 flex h-10 items-center rounded-xl border border-[#1F6878]/15 bg-[#FAF8F4] px-3.5 text-xs font-semibold text-[#073B43]">
                <span>Below Right Hero Promotional Container</span>
              </div>
              <p className="mt-1 text-[11px] text-[#707574]">
                Fixed to align beneath the dark teal promotional image in the homepage hero.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Display Status
              </label>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, displayStatus: "published" }))}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    settings.displayStatus === "published"
                      ? "bg-[#073B43] text-white shadow-sm"
                      : "border border-[#1F6878]/20 bg-[#FAF8F4] text-[#707574] hover:bg-white"
                  }`}
                >
                  Published (Live)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, displayStatus: "draft" }))}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    settings.displayStatus === "draft"
                      ? "bg-[#FB8500] text-white shadow-sm"
                      : "border border-[#1F6878]/20 bg-[#FAF8F4] text-[#707574] hover:bg-white"
                  }`}
                >
                  Draft (Hidden)
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#707574]">
                Toggle to draft if you need to stage changes before making them visible.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION B – Dedicated Hero Image Management */}
        <section
          className="rounded-[24px] border border-[#1F6878]/20 bg-white p-6 shadow-[0_12px_32px_-16px_rgba(31,104,120,0.14)]"
          aria-labelledby="section-b-heading"
        >
          <div className="border-b border-[#1F6878]/10 pb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087E8B]">
              Section B
            </span>
            <h2 id="section-b-heading" className="text-lg font-extrabold text-[#073B43]">
              Dedicated Hero Image Management
            </h2>
            <p className="text-xs text-[#707574]">
              Upload a dedicated promotional hero image for the Before &amp; After transformation module (JPG, PNG, WebP).
            </p>
          </div>

          {/* Important Asset Notice */}
          <div className="mt-4 rounded-xl border border-[#FB8500]/30 bg-[#FFF8EE] p-3.5 text-xs text-[#8F2D15]">
            <p className="font-bold flex items-center gap-1.5 text-[#FB8500]">
              <Sparkles className="h-4 w-4" /> Separate Asset Requirement
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#707574]">
              The Hero Image and Before &amp; After patient clinical photographs are completely separate assets.
              Uploading a hero image does not replace the individual patient photographs shown below.
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Desktop Hero Image */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Desktop Hero Image
              </label>

              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-dashed border-[#1F6878]/25 bg-[#FAF8F4]">
                {settings.heroImage ? (
                  <>
                    <img
                      src={resolveApiAsset(settings.heroImage)}
                      alt={settings.heroImageAlt || "Hero preview"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition hover:opacity-100">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-white text-xs"
                        onClick={() => heroInputRef.current?.click()}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className="text-xs"
                        onClick={() => setSettings((prev) => ({ ...prev, heroImage: "" }))}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <ImageIcon className="h-8 w-8 text-[#707574]" />
                    <p className="mt-2 text-xs font-bold text-[#073B43]">
                      No hero image uploaded
                    </p>
                    <p className="text-[11px] text-[#707574]">
                      Recommended: 1200 × 600 px (JPG, PNG, WebP)
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 bg-[#087E8B] text-white hover:bg-[#073B43]"
                      disabled={uploadingHero}
                      onClick={() => heroInputRef.current?.click()}
                    >
                      {uploadingHero ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload Image
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={heroInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleHeroUpload(file, false);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Mobile Hero Image (Optional) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Mobile Hero Image (Optional)
              </label>

              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-dashed border-[#1F6878]/25 bg-[#FAF8F4]">
                {settings.heroImageMobile ? (
                  <>
                    <img
                      src={resolveApiAsset(settings.heroImageMobile)}
                      alt="Mobile hero preview"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition hover:opacity-100">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-white text-xs"
                        onClick={() => heroMobileInputRef.current?.click()}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Replace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className="text-xs"
                        onClick={() => setSettings((prev) => ({ ...prev, heroImageMobile: "" }))}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                    <ImageIcon className="h-8 w-8 text-[#707574]" />
                    <p className="mt-2 text-xs font-bold text-[#073B43]">
                      Same as desktop image
                    </p>
                    <p className="text-[11px] text-[#707574]">
                      Optional: Square or vertical crop (600 × 600 px)
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs"
                      disabled={uploadingHeroMobile}
                      onClick={() => heroMobileInputRef.current?.click()}
                    >
                      {uploadingHeroMobile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload Mobile Crop
                    </Button>
                  </div>
                )}
              </div>

              <input
                ref={heroMobileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleHeroUpload(file, true);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Alt Text */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Image Alt Text
              </label>
              <Input
                type="text"
                value={settings.heroImageAlt}
                onChange={(e) => setSettings((prev) => ({ ...prev, heroImageAlt: e.target.value }))}
                placeholder="Sri Saraswathi Dental Clinic - Smile Transformation"
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-[#707574]">
                Screen-reader and SEO accessibility description for the promotional hero image.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION C – Existing Before & After Teeth Management */}
        <section
          className="rounded-[24px] border border-[#1F6878]/20 bg-white p-6 shadow-[0_12px_32px_-16px_rgba(31,104,120,0.14)]"
          aria-labelledby="section-c-heading"
        >
          <div className="flex flex-col gap-3 border-b border-[#1F6878]/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087E8B]">
                Section C
              </span>
              <h2 id="section-c-heading" className="text-lg font-extrabold text-[#073B43]">
                Before &amp; After Teeth Management
              </h2>
              <p className="text-xs text-[#707574]">
                Manage patient transformation records. Select which consented records appear in the homepage hero.
              </p>
            </div>

            <Button
              type="button"
              onClick={openNewCaseModal}
              className="bg-[#FB8500] text-white hover:bg-[#FB8500]/90"
            >
              <Plus className="h-4 w-4" /> Add Transformation
            </Button>
          </div>

          {/* Cases Grid */}
          {loadingCases ? (
            <div className="py-12 text-center text-xs text-[#707574]">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#087E8B]" />
              <p className="mt-2">Loading transformation records...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="my-8 rounded-2xl border-2 border-dashed border-[#1F6878]/20 bg-[#FAF8F4] p-8 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-[#707574]" />
              <h3 className="mt-2 text-sm font-bold text-[#073B43]">No Patient Transformations Yet</h3>
              <p className="mt-1 text-xs text-[#707574]">
                Click "Add Transformation" to upload consented BEFORE and AFTER dental patient photographs.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={openNewCaseModal}
                className="mt-4 bg-[#087E8B] text-white"
              >
                <Plus className="h-4 w-4" /> Add First Transformation
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map((item) => {
                const bImg = item.beforeImage || item.before_image || "";
                const aImg = item.afterImage || item.after_image || item.mediaUrl || "";

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[#1F6878]/15 bg-[#FAF8F4] p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#087E8B] hover:shadow-md"
                  >
                    {/* Before & After 1:1 Side by Side Cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative aspect-square overflow-hidden rounded-xl border border-white bg-white">
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-[#073B43] px-2 py-0.5 text-[8px] font-extrabold tracking-wider text-white">
                          BEFORE
                        </span>
                        {bImg ? (
                          <img
                            src={resolveApiAsset(bImg)}
                            alt="Before"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[#707574]">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="relative aspect-square overflow-hidden rounded-xl border border-white bg-white">
                        <span className="absolute top-2 left-2 z-10 rounded-full bg-[#087E8B] px-2 py-0.5 text-[8px] font-extrabold tracking-wider text-white">
                          AFTER
                        </span>
                        {aImg ? (
                          <img
                            src={resolveApiAsset(aImg)}
                            alt="After"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-[#707574]">
                            No image
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Information */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#087E8B]">
                          {item.badgeText || "Clinical Restoration"}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.patientConsent ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                              <ShieldCheck className="h-3 w-3" /> Consented
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                              No Consent
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-1 font-sans text-sm font-bold text-[#073B43] truncate">
                        {item.title}
                      </h3>

                      {item.subtitle && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-[#707574]">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Toggles & Actions */}
                    <div className="mt-3 flex items-center justify-between border-t border-[#1F6878]/10 pt-2.5">
                      <div className="flex items-center gap-2">
                        {/* Homepage Selection Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleHomepageHighlight(item)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                            item.homepageHighlight
                              ? "bg-[#FB8500] text-white shadow-sm"
                              : "border border-[#1F6878]/20 bg-white text-[#707574] hover:bg-[#FAF8F4]"
                          }`}
                          title="Toggle whether this case appears on the Homepage Hero"
                        >
                          {item.homepageHighlight ? "On Homepage" : "Select for Home"}
                        </button>

                        {/* Publish/Draft Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePublished(item)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                            item.published
                              ? "bg-[#073B43] text-white"
                              : "border border-neutral-300 bg-white text-neutral-500"
                          }`}
                        >
                          {item.published ? "Published" : "Draft"}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditCaseModal(item)}
                          aria-label="Edit case"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[#1F6878]/20 bg-white text-[#073B43] transition hover:bg-[#087E8B] hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCase(item.id)}
                          aria-label="Delete case"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal: Add / Edit Patient Transformation */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingCase ? "Edit Patient Transformation" : "Add Patient Transformation"}
          description="Upload consented BEFORE and AFTER dental patient photographs with clinical treatment details."
        >
          <form onSubmit={handleSaveCase} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                Treatment Caption / Title *
              </label>
              <Input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Complete Aesthetic Smile Makeover"
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                  Treatment Category
                </label>
                <Input
                  type="text"
                  value={form.badgeText}
                  onChange={(e) => setForm((prev) => ({ ...prev, badgeText: e.target.value }))}
                  placeholder="e.g. Veneers & Contouring"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                  Brief Clinical Note (Optional)
                </label>
                <Input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Correction of discoloration and minor gaps"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Before & After Upload Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* BEFORE Photo */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                  BEFORE Photo *
                </label>
                <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-[#1F6878]/25 bg-[#FAF8F4]">
                  {form.beforeImage ? (
                    <>
                      <img
                        src={resolveApiAsset(form.beforeImage)}
                        alt="Before Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => beforeInputRef.current?.click()}
                        className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-bold text-white opacity-0 transition hover:opacity-100"
                      >
                        Change Photo
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-3 text-center">
                      <ImageIcon className="h-6 w-6 text-[#707574]" />
                      <p className="mt-1 text-[11px] font-bold text-[#073B43]">BEFORE Photograph</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 text-xs"
                        disabled={uploadingBefore}
                        onClick={() => beforeInputRef.current?.click()}
                      >
                        {uploadingBefore ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Upload
                      </Button>
                    </div>
                  )}
                </div>
                <input
                  ref={beforeInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePatientImageUpload(f, "beforeImage");
                    e.target.value = "";
                  }}
                />
              </div>

              {/* AFTER Photo */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#073B43]">
                  AFTER Photo *
                </label>
                <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-[#1F6878]/25 bg-[#FAF8F4]">
                  {form.afterImage ? (
                    <>
                      <img
                        src={resolveApiAsset(form.afterImage)}
                        alt="After Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => afterInputRef.current?.click()}
                        className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-bold text-white opacity-0 transition hover:opacity-100"
                      >
                        Change Photo
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-3 text-center">
                      <ImageIcon className="h-6 w-6 text-[#707574]" />
                      <p className="mt-1 text-[11px] font-bold text-[#073B43]">AFTER Photograph</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 text-xs"
                        disabled={uploadingAfter}
                        onClick={() => afterInputRef.current?.click()}
                      >
                        {uploadingAfter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Upload
                      </Button>
                    </div>
                  )}
                </div>
                <input
                  ref={afterInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePatientImageUpload(f, "afterImage");
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Checkboxes: Patient Consent & Homepage Selection */}
            <div className="space-y-2.5 rounded-xl border border-[#1F6878]/15 bg-[#FAF8F4] p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.patientConsent}
                  onChange={(e) => setForm((prev) => ({ ...prev, patientConsent: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-[#1F6878]/30 text-[#073B43] focus:ring-[#073B43]"
                />
                <span className="text-xs text-[#073B43]">
                  <strong>Patient Approval / Consent:</strong> The patient has provided written consent for clinical photograph publication.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.homepageHighlight}
                  onChange={(e) => setForm((prev) => ({ ...prev, homepageHighlight: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-[#1F6878]/30 text-[#FB8500] focus:ring-[#FB8500]"
                />
                <span className="text-xs text-[#073B43]">
                  <strong>Homepage Hero Selection:</strong> Display this transformation case in the right-column Hero showcase.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-[#1F6878]/30 text-[#073B43] focus:ring-[#073B43]"
                />
                <span className="text-xs text-[#073B43]">
                  <strong>Publish Case:</strong> Make this transformation record public (uncheck to save as draft).
                </span>
              </label>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingCase || uploadingBefore || uploadingAfter}
                className="bg-[#073B43] text-white hover:bg-[#073B43]/90"
              >
                {savingCase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingCase ? "Update Case" : "Save Case"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
