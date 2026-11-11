import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { FloatingEmergencyButton } from "@/components/ui/FloatingEmergencyButton";
import { CursorFollow } from "@/components/animations/CursorFollow";
import { Providers } from "@/components/layout/Providers";
import { RequireRole } from "@/components/auth/RequireRole";
import { prefetchRoute } from "@/lib/route-prefetch";
import { SiteContentProvider } from "@/components/home/SiteContentSections";

const Home = lazy(() => import("@/pages/Home"));
const AiFeatures = lazy(() => import("@/pages/AiFeatures"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Booking = lazy(() => import("@/pages/Booking"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogArticle = lazy(() => import("@/pages/BlogArticle"));
const Contact = lazy(() => import("@/pages/Contact"));
const Dentists = lazy(() => import("@/pages/Dentists"));
const Treatments = lazy(() => import("@/pages/Treatments"));
const Emergency = lazy(() => import("@/pages/Emergency"));
const Faq = lazy(() => import("@/pages/Faq"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const BeforeAfterPage = lazy(() => import("@/pages/BeforeAfterPage"));
const AchievementsPage = lazy(() => import("@/pages/Achievements"));
const DoctorProfilePage = lazy(() => import("@/pages/DoctorProfile"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const TeleDentistry = lazy(() => import("@/pages/TeleDentistry"));
const ServiceDetail = lazy(() => import("@/pages/ServiceDetail"));
const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const DashboardAiAssistant = lazy(() => import("@/pages/dashboard/AiAssistant"));
const DashboardAnalytics = lazy(() => import("@/pages/dashboard/Analytics"));
const DashboardAppointments = lazy(() => import("@/pages/dashboard/Appointments"));
const DashboardBilling = lazy(() => import("@/pages/dashboard/Billing"));
const DashboardBlogManagement = lazy(() => import("@/pages/dashboard/BlogManagement"));
const DashboardDocuments = lazy(() => import("@/pages/dashboard/Documents"));
const DashboardHeroBanners = lazy(() => import("@/pages/dashboard/HeroBanners"));
const DashboardInventory = lazy(() => import("@/pages/dashboard/Inventory"));
const DashboardMarketing = lazy(() => import("@/pages/dashboard/Marketing"));
const DashboardOffers = lazy(() => import("@/pages/dashboard/Offers"));
const DashboardReelsVideos = lazy(() => import("@/pages/dashboard/ReelsVideos"));
const DashboardPatients = lazy(() => import("@/pages/dashboard/Patients"));
const DashboardSettings = lazy(() => import("@/pages/dashboard/Settings"));
const DashboardSmileGallery = lazy(() => import("@/pages/dashboard/SmileGallery"));
const DashboardStaff = lazy(() => import("@/pages/dashboard/Staff"));
const DashboardTreatments = lazy(() => import("@/pages/dashboard/Treatments"));
const DashboardMedia = lazy(() => import("@/pages/dashboard/MediaLibrary"));
const DashboardSiteContent = lazy(() => import("@/pages/dashboard/SiteContent"));
const DashboardEnquiries = lazy(() => import("@/pages/dashboard/ContactEnquiries"));
const PatientPortal = lazy(() => import("@/pages/patient-portal/PatientPortal"));
const PatientPortalAppointments = lazy(() => import("@/pages/patient-portal/Appointments"));
const PatientPortalMessages = lazy(() => import("@/pages/patient-portal/Messages"));

function RouteLoading() {
  return (
    <div className="grid min-h-[48vh] place-items-center bg-background">
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
        <span className="text-sm font-medium text-muted-foreground">Preparing your view</span>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<Navigate to="/contact" replace />} />
        <Route path="/ai-features" element={<AiFeatures />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blogs" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/our-dentists" element={<Dentists />} />
        <Route path="/our-dentists/achievements" element={<AchievementsPage />} />
        <Route path="/our-dentists/:slug" element={<DoctorProfilePage />} />
        <Route path="/dentists" element={<Navigate to="/our-dentists" replace />} />
        <Route path="/clinic-gallery" element={<GalleryPage />} />
        <Route path="/gallery" element={<Navigate to="/clinic-gallery" replace />} />
        <Route path="/gallery/before-after" element={<BeforeAfterPage />} />
        <Route path="/treatments" element={<Treatments />} />
        <Route path="/treatments/:slug" element={<ServiceDetail />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/tele-dentistry" element={<TeleDentistry />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />

        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/ai-assistant" element={<DashboardAiAssistant />} />
          <Route path="/dashboard/analytics" element={<DashboardAnalytics />} />
          <Route path="/dashboard/appointments" element={<DashboardAppointments />} />
          <Route path="/dashboard/billing" element={<DashboardBilling />} />
          <Route path="/dashboard/blog" element={<DashboardBlogManagement />} />
          <Route path="/dashboard/content" element={<DashboardSiteContent />} />
          <Route path="/dashboard/enquiries" element={<DashboardEnquiries />} />
          <Route path="/dashboard/documents" element={<DashboardDocuments />} />
          <Route path="/dashboard/hero-banners" element={<DashboardHeroBanners />} />
          <Route path="/dashboard/inventory" element={<DashboardInventory />} />
          <Route path="/dashboard/marketing" element={<DashboardMarketing />} />
          <Route path="/dashboard/media" element={<DashboardMedia />} />
          <Route path="/dashboard/offers" element={<DashboardOffers />} />
          <Route path="/dashboard/reels" element={<DashboardReelsVideos />} />
          <Route path="/dashboard/patients" element={<DashboardPatients />} />
          <Route path="/dashboard/settings" element={<DashboardSettings />} />
          <Route path="/dashboard/smile-gallery" element={<DashboardSmileGallery />} />
          <Route path="/dashboard/staff" element={<DashboardStaff />} />
          <Route path="/dashboard/treatments" element={<DashboardTreatments />} />
        </Route>

        <Route element={<RequireRole role="patient" />}>
          <Route path="/patient" element={<Navigate to="/patient-portal" replace />} />
          <Route path="/patient-portal" element={<PatientPortal />} />
          <Route path="/patient-portal/appointments" element={<PatientPortalAppointments />} />
          <Route path="/patient-portal/messages" element={<PatientPortalMessages />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isDashboard = pathname.startsWith("/dashboard");

  useEffect(() => {
    const prefetchFromLink = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      prefetchRoute(anchor.href);
    };

    document.addEventListener("pointerover", prefetchFromLink, { passive: true });
    document.addEventListener("focusin", prefetchFromLink);
    document.addEventListener("touchstart", prefetchFromLink, { passive: true });
    return () => {
      document.removeEventListener("pointerover", prefetchFromLink);
      document.removeEventListener("focusin", prefetchFromLink);
      document.removeEventListener("touchstart", prefetchFromLink);
    };
  }, []);

  return (
    <Providers>
      <ScrollToTop />
      {isDashboard ? (
        <AppRoutes />
      ) : (
        <SiteContentProvider>
          <>
            <Navbar />
            <main className="overflow-x-hidden">
              <AppRoutes />
            </main>
            <Footer />
            <FloatingEmergencyButton />
            <CursorFollow />
          </>
        </SiteContentProvider>
      )}
    </Providers>
  );
}
