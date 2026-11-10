const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/about": () => import("@/pages/About"),
  "/ai-features": () => import("@/pages/AiFeatures"),
  "/auth/login": () => import("@/pages/Login"),
  "/auth/register": () => import("@/pages/Register"),
  "/booking": () => import("@/pages/Booking"),
  "/contact": () => import("@/pages/Contact"),
  "/dentists": () => import("@/pages/Dentists"),
  "/emergency": () => import("@/pages/Emergency"),
  "/faq": () => import("@/pages/Faq"),
  "/reviews": () => import("@/pages/Reviews"),
  "/tele-dentistry": () => import("@/pages/TeleDentistry"),
  "/services/:slug": () => import("@/pages/ServiceDetail"),
  "/dashboard": () => import("@/pages/dashboard/Dashboard"),
  "/dashboard/ai-assistant": () => import("@/pages/dashboard/AiAssistant"),
  "/dashboard/analytics": () => import("@/pages/dashboard/Analytics"),
  "/dashboard/appointments": () => import("@/pages/dashboard/Appointments"),
  "/dashboard/billing": () => import("@/pages/dashboard/Billing"),
  "/dashboard/content": () => import("@/pages/dashboard/SiteContent"),
  "/dashboard/documents": () => import("@/pages/dashboard/Documents"),
  "/dashboard/inventory": () => import("@/pages/dashboard/Inventory"),
  "/dashboard/marketing": () => import("@/pages/dashboard/Marketing"),
  "/dashboard/media": () => import("@/pages/dashboard/MediaLibrary"),
  "/dashboard/patients": () => import("@/pages/dashboard/Patients"),
  "/dashboard/settings": () => import("@/pages/dashboard/Settings"),
  "/dashboard/staff": () => import("@/pages/dashboard/Staff"),
  "/dashboard/treatments": () => import("@/pages/dashboard/Treatments"),
  "/patient-portal": () => import("@/pages/patient-portal/PatientPortal"),
  "/patient-portal/appointments": () => import("@/pages/patient-portal/Appointments"),
  "/patient-portal/messages": () => import("@/pages/patient-portal/Messages"),
};

const prefetchedRoutes = new Map<string, Promise<unknown>>();

export function prefetchRoute(href: string) {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }

  if (url.origin !== window.location.origin) return;
  const routeKey = url.pathname.startsWith("/services/") ? "/services/:slug" : url.pathname;
  const loader = routeLoaders[routeKey];
  if (!loader || prefetchedRoutes.has(routeKey)) return;

  const pending = loader();
  prefetchedRoutes.set(routeKey, pending);
  void pending.catch(() => {
    if (prefetchedRoutes.get(routeKey) === pending) prefetchedRoutes.delete(routeKey);
  });
}
