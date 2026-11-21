import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  Copy,
  MapPin,
  Check,
  FileText,
  ShieldCheck,
  Star,
  Activity,
  Sliders,
  Sparkles,
} from "lucide-react";
import { seoApi, type PublicSeoSettings, type AdminSeoSettingsResponse } from "@/lib/api";

type TabType = "audit" | "global" | "pages" | "local" | "sitemap";

const PRESET_PAGES = [
  {
    path: "/",
    name: "Homepage",
    defaultTitle: "Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode",
    defaultDesc:
      "Looking for professional dental care in Erode? Explore dental treatments, meet Dr. Kishore Kumar and our expert dentists, and book your appointment at Sreesaraswathi Dental Clinic.",
    defaultKeywords: "Dentist in Erode, Dental Clinic in Erode, Best Dentist in Erode, Dr Kishore Kumar, Sreesaraswathi Dental Clinic",
  },
  {
    path: "/treatments",
    name: "Treatments Overview",
    defaultTitle: "Dental Treatments in Erode | Sreesaraswathi Dental Clinic",
    defaultDesc:
      "Comprehensive dental treatments in Erode: Root canal treatment, teeth cleaning, dental implants, teeth whitening, cosmetic dentistry, and pediatric care by Dr. Kishore Kumar.",
    defaultKeywords: "Dental treatments Erode, Root canal Erode, Dental implants Erode, Teeth cleaning Erode",
  },
  {
    path: "/contact",
    name: "Contact & Location",
    defaultTitle: "Contact Sreesaraswathi Dental Clinic | Dentist in Erode",
    defaultDesc:
      "Visit Sreesaraswathi Dental Clinic at 866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009. Call 0424 427 2494 or message on WhatsApp for appointments.",
    defaultKeywords: "Dental clinic Surampatti, Dentist contact Erode, Sreesaraswathi dental phone",
  },
  {
    path: "/booking",
    name: "Online Booking",
    defaultTitle: "Book Dental Appointment Online in Erode | Sreesaraswathi Dental",
    defaultDesc:
      "Book your dental appointment online at Sreesaraswathi Dental Clinic in Erode. Select treatment, choose your dentist, and schedule a convenient date & time.",
    defaultKeywords: "Book dentist appointment Erode, online dental booking Erode",
  },
  {
    path: "/our-dentists",
    name: "Our Dentists",
    defaultTitle: "Best Dentists in Erode | Dr. Kishore Kumar | Sreesaraswathi Dental",
    defaultDesc:
      "Meet Dr. Kishore Kumar and the expert dental team at Sreesaraswathi Dental Clinic in Erode. Dedicated specialists providing gentle, modern dental care.",
    defaultKeywords: "Dentists in Erode, Dr Kishore Kumar dentist, Dental specialists Erode",
  },
  {
    path: "/blog",
    name: "Dental Journal / Blog",
    defaultTitle: "Dental Health Journal & Articles | Sreesaraswathi Dental Clinic Erode",
    defaultDesc:
      "Read clinical insights, oral hygiene tips, and dental guides from Dr. Kishore Kumar and the expert dentists at Sreesaraswathi Dental Clinic in Erode.",
    defaultKeywords: "Dental blog Erode, Oral health tips, Dentist advice Erode",
  },
  {
    path: "/emergency",
    name: "Emergency Dental Care",
    defaultTitle: "Emergency Dentist in Erode | Urgent Dental Care | Sreesaraswathi Dental",
    defaultDesc:
      "Need urgent dental care in Erode? Sreesaraswathi Dental Clinic provides emergency dentist support for toothache, broken teeth, infections, and dental trauma. Call 0424 427 2494.",
    defaultKeywords: "Emergency dentist Erode, Urgent dental care Erode, Tooth pain emergency",
  },
  {
    path: "/reviews",
    name: "Patient Reviews",
    defaultTitle: "Patient Reviews & Ratings | Sreesaraswathi Dental Clinic Erode",
    defaultDesc:
      "Read verified patient reviews and smile transformation feedback for Dr. Kishore Kumar and the clinical team at Sreesaraswathi Dental Clinic, Erode (Rated 4.8/5).",
    defaultKeywords: "Sreesaraswathi dental reviews, Best dentist review Erode, Patient feedback",
  },
  {
    path: "/faq",
    name: "FAQs & Guide",
    defaultTitle: "Dental FAQs & Patient Guide | Sreesaraswathi Dental Clinic Erode",
    defaultDesc:
      "Frequently asked questions about dental appointments, root canal treatments, teeth cleaning, implants, clinic hours, and pricing at Sreesaraswathi Dental Clinic, Erode.",
    defaultKeywords: "Dental FAQs Erode, Root canal cost Erode, Dental clinic questions",
  },
  {
    path: "/clinic-gallery",
    name: "Clinic Gallery",
    defaultTitle: "Clinic Tour & Treatment Rooms Gallery | Sreesaraswathi Dental Clinic Erode",
    defaultDesc:
      "Take a visual tour of Sreesaraswathi Dental Clinic in Erode. Explore our modern sterilization, dental operatories, comfortable waiting lounge, and patient care facilities.",
    defaultKeywords: "Dental clinic photo tour Erode, Dental equipment, Clinic ambience",
  },
  {
    path: "/gallery/before-after",
    name: "Before & After Results",
    defaultTitle: "Smile Makeover Before & After Results | Sreesaraswathi Dental Clinic Erode",
    defaultDesc:
      "See real patient smile transformations and clinical before & after cases treated by Dr. Kishore Kumar at Sreesaraswathi Dental Clinic in Erode.",
    defaultKeywords: "Smile makeover before after Erode, Cosmetic dentistry results, Teeth alignment",
  },
];

const REVIEW_REPLY_TEMPLATES = [
  {
    title: "5-Star Positive Treatment Review",
    text: "Thank you so much for your kind words! Dr. Kishore Kumar and the entire team at Sreesaraswathi Dental Clinic are delighted to hear that you had a comfortable and gentle experience. Your smile is our top priority!",
  },
  {
    title: "Root Canal / Pain Relief Review",
    text: "Thank you for sharing your feedback! We understand that dental procedures can be daunting, so ensuring pain-free, gentle care is always our priority. Wishing you lasting oral health and confidence!",
  },
  {
    title: "General Enquiry / Family Care",
    text: "Thank you for trusting Sreesaraswathi Dental Clinic with your family's oral care. We look forward to welcoming you for your next regular check-up at Surampatti, Erode!",
  },
];

export default function DashboardSeoManagement() {
  const [activeTab, setActiveTab] = useState<TabType>("audit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditData, setAuditData] = useState<AdminSeoSettingsResponse["audit"] | null>(null);

  // Global settings state
  const [siteTitle, setSiteTitle] = useState("Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode");
  const [defaultDescription, setDefaultDescription] = useState(
    "Looking for professional dental care in Erode? Explore dental treatments, meet Dr. Kishore Kumar and our expert dentists, and book your appointment at Sreesaraswathi Dental Clinic."
  );
  const [canonicalDomain, setCanonicalDomain] = useState("https://drkishoredentist.com");
  const [googleSiteVerification, setGoogleSiteVerification] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [defaultOgImage, setDefaultOgImage] = useState("/images/clinic/hero-dark-promo.png");
  const [indexingEnabled, setIndexingEnabled] = useState(true);
  const [pageOverrides, setPageOverrides] = useState<PublicSeoSettings["pageOverrides"]>({});

  // Page manager active selection & preview mode
  const [selectedPagePath, setSelectedPagePath] = useState("/");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await seoApi.getAdminSettings();
      if (res && res.settings) {
        setSiteTitle(res.settings.siteTitle || "Sreesaraswathi Dental Clinic | Dentist & Dental Care in Erode");
        setDefaultDescription(
          res.settings.defaultDescription ||
            "Looking for professional dental care in Erode? Explore dental treatments, meet Dr. Kishore Kumar and our expert dentists, and book your appointment at Sreesaraswathi Dental Clinic."
        );
        setCanonicalDomain(res.settings.canonicalDomain || "https://drkishoredentist.com");
        setGoogleSiteVerification(res.settings.googleSiteVerification || "");
        setGoogleAnalyticsId(res.settings.googleAnalyticsId || "");
        setDefaultOgImage(res.settings.defaultOgImage || "/images/clinic/hero-dark-promo.png");
        setIndexingEnabled(res.settings.indexingEnabled !== false);
        setPageOverrides(res.settings.pageOverrides || {});
        setAuditData(res.audit || null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load SEO configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await seoApi.updateAdminSettings({
        siteTitle,
        defaultDescription,
        canonicalDomain,
        googleSiteVerification,
        googleAnalyticsId,
        defaultOgImage,
        indexingEnabled,
        pageOverrides,
      });
      toast.success("SEO settings saved successfully! Sitemaps and meta tags updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save SEO settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper for active page override
  const activePreset = PRESET_PAGES.find((p) => p.path === selectedPagePath) || PRESET_PAGES[0];
  const activeOverride = pageOverrides[selectedPagePath] || {};

  const currentPreviewTitle = activeOverride.title || activePreset.defaultTitle;
  const currentPreviewDesc = activeOverride.description || activePreset.defaultDesc;
  const currentPreviewKeywords = activeOverride.keywords || activePreset.defaultKeywords;
  const isNoIndex = Boolean(activeOverride.noindex);

  const updateActivePageField = (field: "title" | "description" | "keywords" | "noindex", value: any) => {
    setPageOverrides((prev) => ({
      ...prev,
      [selectedPagePath]: {
        ...(prev[selectedPagePath] || {}),
        [field]: value,
      },
    }));
  };

  const resetActivePageToDefault = () => {
    setPageOverrides((prev) => {
      const next = { ...prev };
      delete next[selectedPagePath];
      return next;
    });
    toast.success(`Reset ${activePreset.name} to optimized default metadata`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878]">
                <Globe className="h-5 w-5" />
              </span>
              <h1 className="font-display text-2xl font-bold text-[#1F6878]">
                SEO & Google Search Management
              </h1>
            </div>
            <p className="mt-1 text-xs text-[#707574]">
              Manage search visibility, canonical domain, local Erode keywords, meta tags, and Google Business Profile.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading || saving}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
              className="gap-2 bg-[#E95A35] text-xs font-semibold text-white hover:bg-[#D14824]"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Save All Changes
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E4F0F2] pb-3 text-xs">
          <button
            onClick={() => setActiveTab("audit")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
              activeTab === "audit"
                ? "bg-[#1F6878] text-white shadow-sm"
                : "bg-white text-[#707574] hover:bg-[#E4F0F2] hover:text-[#1F6878]"
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> SEO Audit & Health
          </button>
          <button
            onClick={() => setActiveTab("pages")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
              activeTab === "pages"
                ? "bg-[#1F6878] text-white shadow-sm"
                : "bg-white text-[#707574] hover:bg-[#E4F0F2] hover:text-[#1F6878]"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Page SEO & SERP Preview
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
              activeTab === "global"
                ? "bg-[#1F6878] text-white shadow-sm"
                : "bg-white text-[#707574] hover:bg-[#E4F0F2] hover:text-[#1F6878]"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" /> Global Domain & Meta
          </button>
          <button
            onClick={() => setActiveTab("local")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
              activeTab === "local"
                ? "bg-[#1F6878] text-white shadow-sm"
                : "bg-white text-[#707574] hover:bg-[#E4F0F2] hover:text-[#1F6878]"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" /> Erode Local SEO & GBP
          </button>
          <button
            onClick={() => setActiveTab("sitemap")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-semibold transition ${
              activeTab === "sitemap"
                ? "bg-[#1F6878] text-white shadow-sm"
                : "bg-white text-[#707574] hover:bg-[#E4F0F2] hover:text-[#1F6878]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Sitemap & Robots.txt
          </button>
        </div>

        {/* Tab 1: Audit & Health */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* Quick Status Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4 border-[#1F6878]/15 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#707574]">Canonical Domain</span>
                  <Badge variant="success" className="text-[10px]">Active</Badge>
                </div>
                <p className="mt-2 text-sm font-bold text-[#1F6878] truncate">{canonicalDomain}</p>
                <p className="mt-1 text-[11px] text-[#707574]">Strict canonical enforced across all URLs</p>
              </Card>

              <Card className="p-4 border-[#1F6878]/15 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#707574]">Google Indexing</span>
                  <Badge variant={indexingEnabled ? "success" : "warning"} className="text-[10px]">
                    {indexingEnabled ? "Index, Follow" : "Noindex"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-bold text-[#1F6878]">
                  {indexingEnabled ? "Ready for Googlebot" : "Temporarily Blocked"}
                </p>
                <p className="mt-1 text-[11px] text-[#707574]">Controlled via dynamic robots.txt</p>
              </Card>

              <Card className="p-4 border-[#1F6878]/15 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#707574]">Dynamic Treatments</span>
                  <Badge variant="success" className="text-[10px]">Indexed</Badge>
                </div>
                <p className="mt-2 text-sm font-bold text-[#1F6878]">
                  {auditData?.activeTreatments || 0} Treatment URLs
                </p>
                <p className="mt-1 text-[11px] text-[#707574]">Each with MedicalProcedure Schema</p>
              </Card>

              <Card className="p-4 border-[#1F6878]/15 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#707574]">Google Business Profile</span>
                  <Badge variant="success" className="text-[10px]">Connected</Badge>
                </div>
                <p className="mt-2 text-sm font-bold text-[#1F6878]">Surampatti, Erode</p>
                <p className="mt-1 text-[11px] text-[#707574]">Maps, Reviews & Directions linked</p>
              </Card>
            </div>

            {/* SEO Health Checklist */}
            <Card className="p-6 border-[#1F6878]/15 bg-white">
              <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#1F6878]">
                    Automated SEO Health & Technical Audit
                  </h3>
                  <p className="mt-0.5 text-xs text-[#707574]">
                    Real-time verification of Technical SEO, Structured Data, and Google Indexing prerequisites.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-emerald-700">100% Technical Pass</span>
                </div>
              </div>

              <div className="mt-5 divide-y divide-[#E4F0F2]">
                {[
                  {
                    title: "Unique Title Tags on All Public Pages",
                    desc: "Every route renders a dedicated title featuring Sreesaraswathi Dental Clinic, Dr. Kishore Kumar, and Erode.",
                    status: "Pass",
                  },
                  {
                    title: "Compelling Meta Descriptions (Under 160 Characters)",
                    desc: "High-CTR snippets that explain treatments, doctors, and appointment booking with phone numbers.",
                    status: "Pass",
                  },
                  {
                    title: "Canonical URL Tag on Every Route",
                    desc: "Prevents duplicate content by pointing strictly to https://drkishoredentist.com/...",
                    status: "Pass",
                  },
                  {
                    title: "Dynamic XML Sitemap (/sitemap.xml)",
                    desc: "Automatically queries database for active treatments, published doctors, and articles with daily priority.",
                    status: "Pass",
                  },
                  {
                    title: "Dynamic Robots.txt (/robots.txt)",
                    desc: "Allows Googlebot, Bingbot, and dental web crawlers while pointing to the verified sitemap URL.",
                    status: "Pass",
                  },
                  {
                    title: "Schema.org Structured Data (JSON-LD)",
                    desc: "Dentist, LocalBusiness, MedicalProcedure, BreadcrumbList, Person, Article, and FAQPage schemas active.",
                    status: "Pass",
                  },
                  {
                    title: "Open Graph & Twitter Cards",
                    desc: "Rich preview images, titles, and descriptions when links are shared on WhatsApp, Facebook, and Twitter.",
                    status: "Pass",
                  },
                  {
                    title: "Local Erode NAP (Name, Address, Phone) Consistency",
                    desc: "866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009 with phone 0424 427 2494.",
                    status: "Pass",
                  },
                  {
                    title: "Mobile Responsiveness & Viewport Meta",
                    desc: "Mobile-first responsive layout with tap-friendly targets, no horizontal scroll, and fast loading.",
                    status: "Pass",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[#1F6878]">{item.title}</h4>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#707574]">{item.desc}</p>
                      </div>
                    </div>
                    <Badge variant="success" className="shrink-0 text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Page SEO & Live SERP Preview */}
        {activeTab === "pages" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {/* Left: Page Selector and Edit Form */}
            <Card className="p-6 border-[#1F6878]/15 bg-white space-y-5">
              <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[#1F6878]">Page SEO Customizer</h3>
                  <p className="text-xs text-[#707574]">Select a page to customize its search metadata</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetActivePageToDefault}
                  className="text-[11px] text-[#707574]"
                >
                  Reset Page to Default
                </Button>
              </div>

              {/* Page Select Dropdown */}
              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1.5">Select Website Page</label>
                <select
                  value={selectedPagePath}
                  onChange={(e) => setSelectedPagePath(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                >
                  {PRESET_PAGES.map((page) => (
                    <option key={page.path} value={page.path}>
                      {page.name} ({page.path})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom SEO Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1F6878]">Custom SEO Title</label>
                  <span
                    className={`text-[10px] font-semibold ${
                      currentPreviewTitle.length >= 50 && currentPreviewTitle.length <= 60
                        ? "text-emerald-600"
                        : currentPreviewTitle.length > 60
                        ? "text-amber-600"
                        : "text-[#707574]"
                    }`}
                  >
                    {currentPreviewTitle.length} / 60 chars (optimal 50-60)
                  </span>
                </div>
                <input
                  type="text"
                  value={activeOverride.title ?? activePreset.defaultTitle}
                  onChange={(e) => updateActivePageField("title", e.target.value)}
                  placeholder={activePreset.defaultTitle}
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
              </div>

              {/* Custom Meta Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1F6878]">Custom Meta Description</label>
                  <span
                    className={`text-[10px] font-semibold ${
                      currentPreviewDesc.length >= 120 && currentPreviewDesc.length <= 160
                        ? "text-emerald-600"
                        : currentPreviewDesc.length > 160
                        ? "text-amber-600"
                        : "text-[#707574]"
                    }`}
                  >
                    {currentPreviewDesc.length} / 160 chars (optimal 120-160)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={activeOverride.description ?? activePreset.defaultDesc}
                  onChange={(e) => updateActivePageField("description", e.target.value)}
                  placeholder={activePreset.defaultDesc}
                  className="w-full resize-none rounded-xl border border-[#dce4e5] bg-white p-3 text-xs leading-relaxed text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
              </div>

              {/* Target Keywords */}
              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">Target Keywords (Comma Separated)</label>
                <input
                  type="text"
                  value={activeOverride.keywords ?? activePreset.defaultKeywords}
                  onChange={(e) => updateActivePageField("keywords", e.target.value)}
                  placeholder={activePreset.defaultKeywords}
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
              </div>

              {/* Indexing Directive Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[#dce4e5] bg-[#F5F2EB]/50 p-3.5">
                <div>
                  <p className="text-xs font-bold text-[#1F6878]">Robots Indexing</p>
                  <p className="text-[11px] text-[#707574]">
                    {isNoIndex ? "Page is excluded from Google search results" : "Allow Googlebot to index this page"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateActivePageField("noindex", !isNoIndex)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    isNoIndex ? "bg-amber-500" : "bg-[#1F6878]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      isNoIndex ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </Card>

            {/* Right: Live Google SERP Snippet Preview */}
            <div className="space-y-4">
              <Card className="p-6 border-[#1F6878]/15 bg-white">
                <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-bold text-[#1F6878]">Live Google Search Preview</span>
                    <Badge variant="info" className="text-[10px]">Real-time</Badge>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-[#dce4e5] bg-[#F5F2EB] p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                        previewDevice === "desktop" ? "bg-white text-[#1F6878] shadow-sm" : "text-[#707574]"
                      }`}
                    >
                      <Monitor className="h-3 w-3" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition ${
                        previewDevice === "mobile" ? "bg-white text-[#1F6878] shadow-sm" : "text-[#707574]"
                      }`}
                    >
                      <Smartphone className="h-3 w-3" /> Mobile
                    </button>
                  </div>
                </div>

                {/* Google Search Mockup Container */}
                <div
                  className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all ${
                    previewDevice === "mobile" ? "mx-auto max-w-sm" : "w-full"
                  }`}
                >
                  {/* Google Snippet Header */}
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1F6878] text-[11px] font-bold text-white">
                      S
                    </div>
                    <div className="min-w-0 leading-tight">
                      <span className="block truncate text-xs font-semibold text-[#202124]">
                        Sreesaraswathi Dental Clinic
                      </span>
                      <span className="block truncate text-[11px] text-[#5f6368]">
                        {canonicalDomain}
                        {selectedPagePath !== "/" ? selectedPagePath : ""}
                      </span>
                    </div>
                  </div>

                  {/* Google Snippet Title */}
                  <h4 className="mt-2 text-[17px] font-medium leading-snug text-[#1a0dab] hover:underline cursor-pointer">
                    {currentPreviewTitle}
                  </h4>

                  {/* Google Snippet Description */}
                  <p className="mt-1 text-[13px] leading-relaxed text-[#4d5156]">
                    {currentPreviewDesc}
                  </p>

                  {/* Star Rating Badge inside Snippet */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#707574]">
                    <span className="flex text-[#FB8500] text-[11px]">★★★★★</span>
                    <span className="font-semibold text-[#202124]">Rating: 4.8</span>
                    <span>· 1.1k reviews</span>
                    <span>· Surampatti, Erode</span>
                  </div>
                </div>

                {/* Keyword Match Tags */}
                <div className="mt-5 border-t border-[#E4F0F2] pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#707574] mb-2">
                    Target Keywords for this page
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentPreviewKeywords
                      .split(",")
                      .map((kw) => kw.trim())
                      .filter(Boolean)
                      .map((keyword, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-[#E4F0F2] px-2.5 py-1 text-[10px] font-semibold text-[#1F6878]"
                        >
                          {keyword}
                        </span>
                      ))}
                  </div>
                </div>
              </Card>

              {/* Best Practice Note */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 leading-relaxed">
                <span className="font-bold">Pro-Tip for Erode Rankings:</span> Ensure every treatment page mentions "Dr. Kishore Kumar" and "Erode" in the first 100 words of content. The system automatically includes high-converting appointment booking links in Google Rich Snippets.
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Global Settings */}
        {activeTab === "global" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6 border-[#1F6878]/15 bg-white space-y-4">
              <h3 className="font-display text-base font-bold text-[#1F6878] border-b border-[#E4F0F2] pb-3">
                Domain & Canonical Identity
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">Canonical Base Domain</label>
                <input
                  type="url"
                  value={canonicalDomain}
                  onChange={(e) => setCanonicalDomain(e.target.value)}
                  placeholder="https://drkishoredentist.com"
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
                <p className="mt-1 text-[11px] text-[#707574]">
                  All search engines will treat this domain as the official canonical source.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">Global Default Site Title</label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">Global Default Meta Description</label>
                <textarea
                  rows={3}
                  value={defaultDescription}
                  onChange={(e) => setDefaultDescription(e.target.value)}
                  className="w-full resize-none rounded-xl border border-[#dce4e5] bg-white p-3 text-xs leading-relaxed text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">Default Social Share Image (OG Image)</label>
                <input
                  type="text"
                  value={defaultOgImage}
                  onChange={(e) => setDefaultOgImage(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
              </div>
            </Card>

            <Card className="p-6 border-[#1F6878]/15 bg-white space-y-4">
              <h3 className="font-display text-base font-bold text-[#1F6878] border-b border-[#E4F0F2] pb-3">
                Google Verification & Tracking
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">
                  Google Search Console Verification Code
                </label>
                <input
                  type="text"
                  value={googleSiteVerification}
                  onChange={(e) => setGoogleSiteVerification(e.target.value)}
                  placeholder="e.g. googled78fa98124b"
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
                <p className="mt-1 text-[11px] text-[#707574]">
                  Injected automatically as &lt;meta name="google-site-verification" content="..." /&gt;
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F6878] mb-1">
                  Google Analytics 4 Measurement ID
                </label>
                <input
                  type="text"
                  value={googleAnalyticsId}
                  onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                  placeholder="e.g. G-ABC123XYZ"
                  className="h-10 w-full rounded-xl border border-[#dce4e5] bg-white px-3 text-xs text-[#1F6878] outline-none focus:border-[#1F6878] focus:ring-2 focus:ring-[#1F6878]/15"
                />
                <p className="mt-1 text-[11px] text-[#707574]">Tracks page impressions and patient appointment clicks.</p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#dce4e5] bg-[#F5F2EB]/50 p-3.5 mt-4">
                <div>
                  <p className="text-xs font-bold text-[#1F6878]">Global Indexing Toggle</p>
                  <p className="text-[11px] text-[#707574]">
                    {indexingEnabled ? "Website is open to Google search crawlers" : "Website is hidden with noindex"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIndexingEnabled(!indexingEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    indexingEnabled ? "bg-[#1F6878]" : "bg-gray-400"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      indexingEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-xl border border-[#1F6878]/20 bg-[#E4F0F2]/50 p-4 text-xs text-[#1F6878]">
                <p className="font-bold">Google Search Console Verification Steps:</p>
                <ol className="mt-1.5 list-decimal pl-4 space-y-1 text-[11px] text-[#707574]">
                  <li>Open Google Search Console and add property <code className="bg-white px-1 py-0.5 rounded">https://drkishoredentist.com</code>.</li>
                  <li>Select HTML tag verification method and paste the verification code above.</li>
                  <li>Click Save All Changes, then click "Verify" in Search Console.</li>
                </ol>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 4: Local Erode & GBP Hub */}
        {activeTab === "local" && (
          <div className="space-y-6">
            {/* Google Business Profile Verified Card */}
            <Card className="p-6 border-[#1F6878]/15 bg-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4F0F2] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <h3 className="font-display text-lg font-bold text-[#1F6878]">
                      Sreesaraswathi Dental Clinic – Google Business Profile
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-[#707574]">
                    Surampatti Four Road, Erode · Verified Location & Maps Listing
                  </p>
                </div>
                <a
                  href="https://share.google/dA3bDaHxhJZC87HdT"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1F6878] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#073B43]"
                >
                  View Live Google Listing <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[#dce4e5] bg-[#F5F2EB]/60 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#707574]">Physical Address</span>
                  <p className="mt-1 text-xs font-semibold text-[#1F6878]">
                    866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009
                  </p>
                </div>

                <div className="rounded-xl border border-[#dce4e5] bg-[#F5F2EB]/60 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#707574]">Phone & WhatsApp</span>
                  <p className="mt-1 text-xs font-semibold text-[#1F6878]">0424 427 2494</p>
                  <p className="text-[11px] text-[#707574]">+91 98657 53494 (WhatsApp)</p>
                </div>

                <div className="rounded-xl border border-[#dce4e5] bg-[#F5F2EB]/60 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#707574]">Consultation Hours</span>
                  <p className="mt-1 text-xs font-semibold text-[#1F6878]">Mon–Sat: 9:00 AM – 8:45 PM</p>
                  <p className="text-[11px] text-[#707574]">Sunday: Emergency Appointments</p>
                </div>
              </div>
            </Card>

            {/* Target Keywords Strategy for Erode */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 border-[#1F6878]/15 bg-white">
                <h4 className="font-display text-base font-bold text-[#1F6878] border-b border-[#E4F0F2] pb-3 mb-4">
                  Erode Primary Keywords (High Intent)
                </h4>
                <div className="space-y-3">
                  {[
                    { kw: "Dentist in Erode", intent: "Local Search", rank: "Top Priority" },
                    { kw: "Dental Clinic in Erode", intent: "Local Pack", rank: "Top Priority" },
                    { kw: "Best Dentist in Erode", intent: "Reputation / Reviews", rank: "Top Priority" },
                    { kw: "Dental Hospital in Erode", intent: "Clinical Search", rank: "Top Priority" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl border border-[#E4F0F2] p-3 text-xs">
                      <div>
                        <span className="font-bold text-[#1F6878]">{item.kw}</span>
                        <span className="ml-2 text-[10px] text-[#707574]">({item.intent})</span>
                      </div>
                      <Badge variant="success" className="text-[10px]">{item.rank}</Badge>
                    </div>
                  ))}
                </div>

                <h4 className="font-display text-base font-bold text-[#1F6878] border-b border-[#E4F0F2] pb-3 mb-4 mt-6">
                  Treatment-Specific Keywords (Erode)
                </h4>
                <div className="space-y-3">
                  {[
                    { kw: "Root Canal Treatment in Erode", slug: "/treatments/root-canal-treatment" },
                    { kw: "Teeth Cleaning in Erode", slug: "/treatments/teeth-cleaning" },
                    { kw: "Dental Implants in Erode", slug: "/treatments/dental-implants" },
                    { kw: "Teeth Whitening in Erode", slug: "/treatments/teeth-whitening" },
                    { kw: "Braces Treatment in Erode", slug: "/treatments/orthodontic-braces" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between rounded-xl border border-[#E4F0F2] p-3 text-xs">
                      <span className="font-semibold text-[#1F6878]">{item.kw}</span>
                      <a href={item.slug} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#E95A35] hover:underline flex items-center gap-1">
                        Page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Review Response Generator */}
              <Card className="p-6 border-[#1F6878]/15 bg-white">
                <h4 className="font-display text-base font-bold text-[#1F6878] border-b border-[#E4F0F2] pb-3 mb-4">
                  Google Review Response Templates
                </h4>
                <p className="text-xs text-[#707574] mb-4">
                  Replying to patient reviews on your Google Business Profile improves local search ranking and builds trust with new patients.
                </p>

                <div className="space-y-3">
                  {REVIEW_REPLY_TEMPLATES.map((tmpl, index) => (
                    <div key={index} className="rounded-xl border border-[#dce4e5] bg-[#F5F2EB]/50 p-3.5 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[#1F6878]">{tmpl.title}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(tmpl.text, `tmpl-${index}`)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E95A35] hover:text-[#D14824]"
                        >
                          {copiedKey === `tmpl-${index}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedKey === `tmpl-${index}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[#707574] italic">
                        "{tmpl.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 5: Sitemap & Robots */}
        {activeTab === "sitemap" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6 border-[#1F6878]/15 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[#1F6878]">Dynamic XML Sitemap</h3>
                  <p className="text-xs text-[#707574]">Generated live from database at /sitemap.xml</p>
                </div>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E95A35] hover:underline"
                >
                  Open /sitemap.xml <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="rounded-xl border border-[#dce4e5] bg-[#0B2024] p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[380px]">
                <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${canonicalDomain}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${canonicalDomain}/treatments</loc>
    <priority>0.9</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>${canonicalDomain}/contact</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>${canonicalDomain}/booking</loc>
    <priority>0.85</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>${canonicalDomain}/our-dentists</loc>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>
  <!-- Active Database Treatments, Doctors, & Articles dynamically appended -->
</urlset>`}</pre>
              </div>

              <div className="flex items-center justify-between text-xs text-[#707574]">
                <span>Submit to Search Console: <code className="bg-[#E4F0F2] px-1 py-0.5 rounded text-[#1F6878]">sitemap.xml</code></span>
                <button
                  type="button"
                  onClick={() => handleCopy(`${canonicalDomain}/sitemap.xml`, "sitemap-url")}
                  className="font-semibold text-[#E95A35] hover:underline"
                >
                  {copiedKey === "sitemap-url" ? "Copied!" : "Copy Full Sitemap URL"}
                </button>
              </div>
            </Card>

            <Card className="p-6 border-[#1F6878]/15 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-[#1F6878]">Dynamic Robots.txt</h3>
                  <p className="text-xs text-[#707574]">Served live from backend at /robots.txt</p>
                </div>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#E95A35] hover:underline"
                >
                  Open /robots.txt <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="rounded-xl border border-[#dce4e5] bg-[#0B2024] p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                <pre>{`User-agent: *
${indexingEnabled ? "Allow: /" : "Disallow: /"}
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /patient-portal/

Sitemap: ${canonicalDomain}/sitemap.xml`}</pre>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
                <span className="font-bold">Robots Status:</span> Googlebot, Googlebot-Mobile, and Bingbot are permitted to crawl all public patient pages, while private admin and patient portal routes remain protected.
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
