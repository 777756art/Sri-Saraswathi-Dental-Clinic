import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/about": "About Us",
  "/ai-features": "AI Platform",
  "/auth/login": "Sign In",
  "/auth/register": "Create Account",
  "/booking": "Book an Appointment",
  "/contact": "Contact Us",
  "/dentists": "Our Dentists",
  "/emergency": "Emergency Dentistry",
  "/faq": "FAQs",
  "/gallery": "Clinic Gallery",
  "/reviews": "Patient Reviews",
  "/tele-dentistry": "Tele-dentistry",
  "/dashboard": "Dashboard",
  "/dashboard/ai-assistant": "AI Assistant",
  "/dashboard/analytics": "Analytics",
  "/dashboard/appointments": "Appointments",
  "/dashboard/billing": "Billing",
  "/dashboard/documents": "Documents",
  "/dashboard/inventory": "Inventory",
  "/dashboard/marketing": "Marketing",
  "/dashboard/patients": "Patients",
  "/dashboard/settings": "Settings",
  "/dashboard/staff": "Staff",
  "/dashboard/treatments": "Treatments",
  "/patient-portal": "Patient Portal",
  "/patient-portal/appointments": "My Appointments",
  "/patient-portal/messages": "Messages",
};

export function ScrollToTop() {
  const pathname = useLocation().pathname;

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    const t1 = setTimeout(() => window.scrollTo(0, 0), 50);
    const t2 = setTimeout(() => window.scrollTo(0, 0), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/") {
      document.title = "Sri Saraswathi Dental Clinic — Your Smile, Reimagined";
      return;
    }
    const slug = pathname.startsWith("/services/") ? pathname.split("/")[2] : "";
    const label = pageTitles[pathname] ?? (slug ? slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") : undefined);
    document.title = label ? `${label} · Sri Saraswathi Dental Clinic` : "Sri Saraswathi Dental Clinic";
  }, [pathname]);

  return null;
}
