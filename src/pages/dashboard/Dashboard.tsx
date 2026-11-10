import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Calendar,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  Images,
  LayoutTemplate,
  Loader2,
  Megaphone,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { api, ApiError, resolveApiAsset, statusTone, type AdminSummary, type SiteContent } from "@/lib/api";
import { clinicImages } from "@/lib/images";

const relative = (iso?: string) => {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const initials = (name?: string) => {
  if (!name) return "PT";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.map((part) => part[0]).slice(0, 2).join("").toUpperCase() : "PT";
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent[]>([]);
  const [catalogFallback, setCatalogFallback] = useState<{ doctors: number; treatments: number }>({ doctors: 0, treatments: 0 });
  const [loading, setLoading] = useState(true);
  const [seating, setSeating] = useState<number | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await api.get<AdminSummary>("/api/admin/summary");
      setSummary(data);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load today's snapshot.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    let active = true;
    api.get<{ items: SiteContent[] }>("/api/content")
      .then((data) => { if (active) setSiteContent(Array.isArray(data.items) ? data.items : []); })
      .catch(() => { if (active) setSiteContent([]); });
    api.get<{ dentists: string[]; services: { value: string; label: string }[] }>("/api/meta")
      .then((data) => { if (active) setCatalogFallback({ doctors: data.dentists.length, treatments: data.services.length }); })
      .catch(() => {});
    return () => { active = false; };
  }, [load]);

  const now = new Date();
  const counts = summary?.counts;
  const schedule = summary?.todaySchedule ?? [];
  const recentBookings = summary?.recent ?? [];
  const publishedBlogs = siteContent.filter((item) => item.type === "blog" && item.published).length;
  const publishedDoctors = siteContent.filter((item) => item.type === "doctor" && item.published).length;
  const publishedTreatments = siteContent.filter((item) => item.type === "treatment" && item.published && item.availableForBooking).length;
  const publishedOffers = siteContent.filter((item) => item.type === "offer" && item.published).length;
  const publishedReels = siteContent.filter((item) => (item.type === "reel" || item.type === "video") && item.published).length;
  const publishedGallery = siteContent.filter((item) => item.type === "image" && item.published).length;
  const activeBanner = useMemo(
    () => siteContent.filter((item) => item.type === "hero" && item.published).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)[0],
    [siteContent],
  );
  const recentMedia = siteContent.filter((item) => ["image", "reel", "video"].includes(item.type) && item.published && item.mediaUrl).slice(0, 4);

  const metrics = [
    { title: "Pending appointments", value: counts?.pending, detail: "Awaiting your response", icon: Clock, tone: "orange" },
    { title: "Confirmed appointments", value: counts?.confirmed, detail: "This week", icon: Calendar, tone: "green" },
    { title: "Today’s appointments", value: counts?.today, detail: schedule[0] ? `Next at ${schedule[0].time}` : "No visits scheduled", icon: CheckCircle2, tone: "blue" },
    { title: "Total doctors", value: publishedDoctors || catalogFallback.doctors, detail: "Published profiles", icon: Users, tone: "pink" },
    { title: "Active treatments", value: publishedTreatments || catalogFallback.treatments, detail: "Available on the website", icon: ImageIcon, tone: "violet" },
    { title: "Published blogs", value: publishedBlogs, detail: "Live on the website", icon: BookOpenText, tone: "sage" },
  ];

  const seatPatient = async (id: number, patient: string) => {
    setSeating(id);
    try {
      await api.patch(`/api/admin/bookings/${id}`, { status: "checked_in" });
      toast.success(`${patient} checked in`);
      await load(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update the booking.");
    } finally {
      setSeating(null);
    }
  };

  const quickActions = [
    { label: "Add doctor", href: "/dashboard/staff", icon: Users },
    { label: "Add treatment", href: "/dashboard/treatments", icon: Plus },
    { label: "Add offer", href: "/dashboard/offers", icon: Megaphone },
    { label: "Create blog", href: "/dashboard/blog", icon: BookOpenText },
  ];

  return (
    <DashboardLayout>
      <section aria-label="Clinic summary" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <article key={metric.title} className="min-h-[142px] rounded-[20px] border border-[#ece4db] bg-white p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-card sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" data-tone={metric.tone}>
              <metric.icon className="h-[19px] w-[19px]" />
            </div>
            <p className="mt-4 font-display text-[30px] leading-none tracking-tight text-[#17484d]">{metric.value ?? (loading ? "—" : "0")}</p>
            <p className="mt-2 text-[12px] font-semibold leading-tight text-[#24464a]">{metric.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-[22px] border border-[#ece4db] bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8e1] px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-display text-[21px] text-[#17484d]">Recent appointment requests</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">New bookings that need your attention</p>
            </div>
            <Link to="/dashboard/appointments" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#17484d] hover:text-accent">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="divide-y divide-[#f0ebe5]">
            {recentBookings.slice(0, 5).map((booking) => (
              <Link key={booking.id} to="/dashboard/appointments" className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-[#fcfbfa] sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf4f3] text-[11px] font-bold text-[#17545a]">{initials(booking.patientName)}</span>
                <span className="min-w-[145px] flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#24464a]">{booking.patientName}</span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{booking.serviceLabel}</span>
                </span>
                <span className="min-w-[112px] text-right text-[11.5px] text-[#445d60] sm:text-left">
                  <span className="block font-semibold">{booking.dateLabel}</span><span className="mt-0.5 block text-muted-foreground">{booking.time}</span>
                </span>
                <Badge variant={statusTone[booking.status]} size="sm">{booking.statusLabel}</Badge>
                <ArrowRight className="hidden h-4 w-4 text-[#96a5a6] sm:block" />
              </Link>
            ))}
            {!loading && recentBookings.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted-foreground">New website bookings will appear here.</p>}
            {loading && recentBookings.length === 0 && <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading appointment requests…</div>}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#17464b] bg-[#17464b] p-5 text-white shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-display text-[21px]">Today’s schedule</h2><p className="mt-1 text-[12px] text-white/60">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p></div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80">{schedule.length} visits</span>
          </div>
          <div className="mt-5 space-y-2.5">
            {schedule.slice(0, 4).map((appointment) => (
              <div key={appointment.id} className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-white/[0.07] p-3">
                <span className="shrink-0 rounded-lg border border-white/10 bg-[#0d383e] px-2.5 py-2 text-[10px] font-bold tabular-nums text-[#d5eeee]">{appointment.time}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold text-white">{appointment.patientName}</p><p className="mt-0.5 truncate text-[10.5px] text-white/55">{appointment.serviceLabel}</p></div>
                {appointment.status === "confirmed" && <button type="button" onClick={() => void seatPatient(appointment.id, appointment.patientName)} disabled={seating === appointment.id} className="shrink-0 rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-[#17464b] transition hover:bg-[#eff9f7] disabled:opacity-50">{seating === appointment.id ? "…" : "Check in"}</button>}
                {appointment.status !== "confirmed" && <Badge variant={statusTone[appointment.status]} size="sm">{appointment.statusLabel}</Badge>}
              </div>
            ))}
            {!loading && schedule.length === 0 && <div className="rounded-xl border border-dashed border-white/20 px-4 py-7 text-center text-[12px] text-white/65">No appointments scheduled for today.</div>}
          </div>
          <Link to={{ pathname: "/dashboard/appointments", search: "?view=calendar&panel=availability" }} className="mt-4 flex items-center justify-center gap-1 border-t border-white/10 pt-4 text-[12px] font-semibold text-white/75 transition hover:text-white">Manage availability <ArrowRight className="h-3.5 w-3.5" /></Link>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <section className="rounded-[22px] border border-[#ece4db] bg-white p-5 shadow-soft sm:p-6">
          <div><h2 className="font-display text-[21px] text-[#17484d]">Quick actions</h2><p className="mt-1 text-[12px] text-muted-foreground">Create or update clinic content quickly</p></div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => <Link key={action.label} to={action.href} className="group flex min-h-[64px] items-center gap-3 rounded-[15px] border border-[#eee7df] bg-white px-3.5 py-3 transition hover:border-[#efb8d0] hover:bg-[#fffafd] hover:shadow-soft"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f4f0] text-[#174f54] transition group-hover:bg-[#fce8f1] group-hover:text-accent"><action.icon className="h-4 w-4" /></span><span className="text-[12px] font-semibold leading-tight text-[#2d4a4d]">{action.label}</span></Link>)}
          </div>
        </section>

        <section className="rounded-[22px] border border-[#ece4db] bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-[21px] text-[#17484d]">Website content overview</h2><p className="mt-1 text-[12px] text-muted-foreground">Published items currently visible on your website</p></div><Link to="/dashboard/content" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#174f54] hover:text-accent">Manage <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
          <div className="mt-6 grid grid-cols-2 gap-y-5 sm:grid-cols-5 sm:divide-x sm:divide-[#eee8e1]">
            {[{value: activeBanner ? "Live" : "Default", label: "Hero banner", icon: LayoutTemplate}, {value: publishedOffers, label: "Active offers", icon: Megaphone}, {value: publishedReels, label: "Published reels", icon: Sparkles}, {value: publishedBlogs, label: "Published blogs", icon: BookOpenText}, {value: publishedGallery, label: "Gallery images", icon: Images}].map((item) => <div key={item.label} className="px-2 sm:px-3"><span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"><item.icon className="h-3.5 w-3.5 text-accent" />{item.label}</span><p className="mt-2 font-display text-[27px] leading-none text-[#17484d]">{item.value}</p></div>)}
          </div>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-[22px] border border-[#ece4db] bg-white p-4 shadow-soft sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[20px] text-[#17484d]">Active Homepage Banner</h2>
            <p className="mt-1 text-[11.5px] text-muted-foreground">The first published slide on your clinic website</p>
          </div>
          <Badge variant={activeBanner ? "success" : "info"}>{activeBanner ? "Live Slide 1" : "Clinic default"}</Badge>
        </div>
        <div className="relative min-h-[230px] overflow-hidden rounded-[18px] bg-[#17464b] sm:min-h-[280px]">
          <img src={activeBanner?.mediaUrl ? resolveApiAsset(activeBanner.mediaUrl) : clinicImages.heroDentalCare} alt={activeBanner?.title || "Sri Saraswathi Dental Clinic hero image"} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c292d]/85 via-[#0c292d]/15 to-transparent" />
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-4 sm:inset-x-6 sm:bottom-5">
            <div className="max-w-xl text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">{activeBanner?.badgeText || "Sri Saraswathi Dental Clinic · Erode"}</p>
              <h3 className="mt-1 font-display text-[22px] leading-tight sm:text-[27px]">{activeBanner?.title || "Your smile, cared for with confidence."}</h3>
              {activeBanner?.subtitle && <p className="mt-1 text-[12px] text-white/75">{activeBanner.subtitle}</p>}
            </div>
            <Link to="/dashboard/hero-banners" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[11px] font-semibold text-[#17464b] transition hover:bg-[#fce8f1]">Change Visual <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/dashboard/hero-banners" className="flex-1 rounded-xl bg-[#eef0ff] px-4 py-2.5 text-center text-[12px] font-semibold text-[#294d58] transition hover:bg-[#e5e9ff]">Change Slide</Link>
          <Link to="/dashboard/hero-banners" className="flex-1 rounded-xl bg-[#ff7257] px-4 py-2.5 text-center text-[12px] font-semibold text-white transition hover:bg-[#f25e44]">Manage All Slides</Link>
        </div>
      </section>

      <section className="mt-5 rounded-[22px] border border-[#ece4db] bg-white p-4 shadow-soft sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-[19px] text-[#17484d]">Clinic Images</h2>
            <p className="hidden text-[12px] font-medium text-[#788a8e] sm:block">Recently added</p>
          </div>
          <Link to="/dashboard/content?type=image" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#174f54] hover:text-accent">See all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link to="/dashboard/content?type=image" className="grid aspect-square place-items-center rounded-[18px] border-2 border-dashed border-[#d8c9e2] bg-[#f4eafb] p-4 text-center transition hover:bg-[#efe0f7]">
            <span><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#eadcf7] text-[#7652b3]"><Plus className="h-5 w-5" /></span><span className="mt-2 block text-[12px] font-semibold text-[#33444f]">Upload Image</span><span className="mt-1 block text-[10px] text-[#829297]">1200 × 1200 recommended</span></span>
          </Link>
          {(recentMedia.filter((item) => item.type === "image").slice(0, 3).length
            ? recentMedia.filter((item) => item.type === "image").slice(0, 3).map((item) => ({ src: resolveApiAsset(item.mediaUrl), title: item.title }))
            : [clinicImages.practiceErode, clinicImages.reception, clinicImages.treatmentRoom].map((src, index) => ({ src, title: ["Inside the practice", "Clinic reception", "Treatment room"][index] }))
          ).map((photo) => (
            <Link key={photo.src} to="/dashboard/content?type=image" className="group relative aspect-square overflow-hidden rounded-[18px] bg-[#eef2f1]">
              <img src={photo.src} alt={photo.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0c292d]/75 to-transparent px-3 pb-3 pt-8 text-[11px] font-semibold text-white">{photo.title}</span>
            </Link>
          ))}
        </div>
      </section>    </DashboardLayout>
  );
}
