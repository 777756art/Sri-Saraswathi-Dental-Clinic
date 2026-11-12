"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { clinicImages } from "@/lib/images";
import { useAuth } from "@/lib/use-auth";
import { api, type AdminSummary } from "@/lib/api";
import {
  Bell,
  BookOpenText,
  Award,
  Calendar,
  Clock3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  type LucideIcon,
  Home,
  Image,
  Images,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquareText,
  Settings,
  Star,
  Stethoscope,
  Users,
  Video,
  X,
} from "lucide-react";

type DashboardNavLink = { label: string; href: string; icon: LucideIcon; search?: string };

const sidebarGroups: { label: string; links: DashboardNavLink[] }[] = [
  { label: "Overview", links: [{ label: "Dashboard", href: "/dashboard", icon: Home }] },
  { label: "Appointments", links: [
    { label: "Appointment Requests", href: "/dashboard/appointments", icon: Calendar },
    { label: "Appointment Calendar", href: "/dashboard/appointments", search: "?view=calendar", icon: Calendar },
    { label: "Availability & Schedule", href: "/dashboard/appointments", search: "?view=calendar&panel=availability", icon: Clock3 },
  ] },
  { label: "Website Content", links: [
    { label: "Hero Banner", href: "/dashboard/hero-banners", icon: Images },
    { label: "Doctors", href: "/dashboard/staff", icon: Users },
    { label: "Treatments", href: "/dashboard/treatments", icon: Stethoscope },
    { label: "Treatment Highlights", href: "/dashboard/content", search: "?type=badge", icon: Images },
    { label: "Reels Management", href: "/dashboard/reels", icon: Video },
    { label: "Offer Banners", href: "/dashboard/offers", icon: Megaphone },
    { label: "Gallery", href: "/dashboard/smile-gallery", icon: Image },
    { label: "Clinic Photos", href: "/dashboard/content", search: "?type=image", icon: Images },
    { label: "Doctors’ Achievements", href: "/dashboard/content", search: "?type=achievement", icon: Award },
    { label: "Google Reviews", href: "/dashboard/google-reviews", icon: Star },
    { label: "Patient Testimonials", href: "/dashboard/content", search: "?type=testimonial", icon: MessageSquareText },
    { label: "Blog / Journal", href: "/dashboard/blog", icon: BookOpenText },
  ] },
  { label: "Other", links: [
    { label: "Contact enquiries", href: "/dashboard/enquiries", icon: MessageSquareText },
    { label: "Messages", href: "/dashboard/ai-assistant", icon: MessageCircle },
    { label: "Website Settings", href: "/dashboard/settings", icon: Settings },
  ] },
];

type Notification = { id: number | string; title: string; detail: string; time: string; unread: boolean };

const relativeTime = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Clinic team";
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "SC";

  const handleSignOut = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (user?.role !== "admin") return;
    let active = true;
    api
      .get<AdminSummary>("/api/admin/summary")
      .then((data) => {
        if (!active) return;
        const items: Notification[] = data.recent
          .filter((booking) => booking.status === "pending")
          .slice(0, 3)
          .map((booking) => ({
            id: booking.id,
            title: `New booking · ${booking.ref}`,
            detail: `${booking.patientName} · ${booking.serviceLabel} · ${booking.dateLabel}, ${booking.time}`,
            time: "Awaiting confirmation",
            unread: true,
          }));
        if (data.counts.today > 0) {
          items.push({
            id: "today",
            title: `${data.counts.today} appointment${data.counts.today === 1 ? "" : "s"} today`,
            detail: "Open the schedule to check patients in.",
            time: "Today",
            unread: true,
          });
        }
        data.recentPatients.slice(0, 1).forEach((patient) => {
          items.push({
            id: `p-${patient.id}`,
            title: "New patient registered",
            detail: `${patient.name} · ${patient.phone}`,
            time: relativeTime(patient.joinedAt),
            unread: false,
          });
        });
        data.recentLogins.forEach((patient) => {
          items.push({
            id: `login-${patient.id}`,
            title: "Patient signed in",
            detail: `${patient.name} · ${patient.email}`,
            time: relativeTime(patient.lastLoginAt),
            unread: false,
          });
        });
        if (items.length === 0) {
          items.push({
            id: "empty",
            title: "No new bookings yet",
            detail: "Patient bookings will appear here the moment they are made.",
            time: "Live",
            unread: false,
          });
        }
        setNotifications(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="dashboard-shell flex h-dvh overflow-hidden bg-secondary-50/60">
      {/* Sidebar */}
      <aside
        className={cn(
          "dashboard-sidebar fixed inset-y-0 left-0 z-40 flex flex-col bg-ink-950 transition-all duration-300 lg:static",
          collapsed ? "w-[76px]" : "w-[300px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-5 z-10 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        {/* Logo */}
        <div
          className={cn(
            "flex h-[92px] items-center border-b border-white/10",
            collapsed ? "justify-center px-3" : "justify-between px-5"
          )}
        >
          <Link to="/dashboard" className="flex min-w-0 items-center justify-center">
            <img
              src={collapsed ? clinicImages.logoMark : clinicImages.logoLight}
              alt="Sri Saraswathi Dental Clinic"
              width={176}
              height={76}
              decoding="async"
              className={cn("shrink-0 object-contain", collapsed ? "h-8 w-auto max-w-[38px]" : "h-[46px] w-auto max-w-[140px]")}
            />
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="hidden rounded-lg p-1.5 text-[#E4F0F2]/75 transition-colors hover:bg-white/10 hover:text-white lg:block"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="mx-auto mt-3 hidden rounded-lg p-1.5 text-[#E4F0F2]/75 transition-colors hover:bg-white/10 hover:text-white lg:block"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Navigation */}
        <nav className="dashboard-nav flex-1 overflow-y-auto px-3 py-5">
          {sidebarGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-1">
              {!collapsed && <p className="dashboard-nav-group-title mb-2 px-3">{group.label}</p>}
              <ul className="space-y-1">
                {group.links.map((link) => {
                  const isRouteActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname === link.href || pathname.startsWith(link.href + "/");
                  const appointmentView = new URLSearchParams(location.search).get("view");
                  const isActive = isRouteActive && (link.search ? location.search === link.search : !(link.href === "/dashboard/appointments" && appointmentView === "calendar"));
                  return (
                    <li key={link.label}>
                      <Link
                        to={{ pathname: link.href, search: link.search ?? "" }}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? link.label : undefined}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "dashboard-nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                          collapsed && "justify-center px-0",
                          isActive ? "bg-[#1F6878] text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <link.icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", isActive ? "text-[#E4F0F2]" : "text-white/60 group-hover:text-[#E4F0F2]")} />
                        {!collapsed && <span>{link.label}</span>}
                        {!collapsed && isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#E4F0F2]" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="dashboard-user border-t border-white/10 p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-2 py-2",
              collapsed && "justify-center px-0"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4F0F2] text-[12px] font-semibold text-[#1F6878]">
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate dashboard-user-name text-[13px] font-medium text-white">{displayName}</p>
                <p className="truncate text-[11px] text-[#E4F0F2]/70">
                  {user?.role === "admin" ? "Clinic administrator" : "Care team"}
                </p>
              </div>
            )}
          </div>
          <Link
            to="/"
            className={cn(
              "mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-[#E4F0F2]/80 transition-colors hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-0"
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {!collapsed && "Back to website"}
          </Link>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Page content */}
        <main className="dashboard-main min-h-0 flex-1 overflow-y-auto">
          <div className="dashboard-content mx-auto w-full max-w-[1640px] p-4 sm:p-6 lg:p-8">
            <header className="dashboard-welcome mb-8 flex flex-wrap items-center justify-between gap-5 sm:mb-10">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                  className="mt-1 rounded-lg p-1.5 text-[#1F6878] transition hover:bg-[#E4F0F2] lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1F6878]">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <h1 className="mt-2 font-display text-[clamp(1.8rem,3.1vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[#1F6878]">
                    Welcome back, {user?.firstName || "Admin"}
                  </h1>
                  <p className="mt-2 text-[13px] text-[#707574] sm:text-[14px]">
                    Manage clinic appointments and website content from one calm workspace.
                  </p>
                </div>
              </div>

              <div ref={popoverRef} className="ml-auto flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); }}
                    aria-label="Notifications"
                    aria-expanded={notificationsOpen}
                    className="relative grid h-10 w-10 place-items-center rounded-full border border-[#dce4e5] bg-white text-[#1F6878] transition hover:border-[#1F6878] hover:text-[#1F6878]"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#E95A35] ring-2 ring-white" />}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-full z-50 mt-3 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#dce4e5] bg-white shadow-lift">
                      <div className="flex items-center justify-between border-b border-[#E4F0F2] px-4 py-3">
                        <p className="text-[13px] font-semibold text-[#1F6878]">Notifications</p>
                        <button onClick={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))} className="text-[11px] font-semibold text-[#1F6878] hover:text-[#1F6878]">Mark all read</button>
                      </div>
                      <ul className="max-h-72 overflow-y-auto">
                        {notifications.map((item) => (
                          <li key={item.id} className="border-b border-[#E4F0F2] px-4 py-3 last:border-0">
                            <p className="text-[12px] font-semibold text-[#1F6878]">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-[#707574]">{item.detail}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#707574]/75">{item.time}</p>
                          </li>
                        ))}
                      </ul>
                      <Link to="/dashboard/appointments" className="block px-4 py-3 text-center text-[11px] font-semibold text-[#1F6878] hover:bg-[#E4F0F2]/50">View appointment requests</Link>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}
                    aria-label="Account menu"
                    aria-expanded={profileOpen}
                    className="flex items-center gap-2.5 rounded-full px-1 py-1 text-left transition hover:bg-[#E4F0F2]/60"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E4F0F2] text-[12px] font-bold text-[#1F6878]">{initials}</span>
                    <span className="hidden sm:block">
                      <span className="block max-w-36 truncate text-[12px] font-bold leading-tight text-[#1F6878]">{displayName}</span>
                      <span className="mt-1 block text-[10px] text-[#707574]">Admin</span>
                    </span>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#dce4e5] bg-white shadow-lift">
                      <div className="border-b border-[#E4F0F2] px-4 py-3">
                        <p className="truncate text-[13px] font-semibold text-[#1F6878]">{displayName}</p>
                        <p className="truncate text-[11px] text-[#707574]">{user?.email}</p>
                      </div>
                      <Link to="/dashboard/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-[#1F6878] hover:bg-[#E4F0F2]/60"><Settings className="h-4 w-4 text-[#1F6878]" /> Website settings</Link>
                      <Link to="/" className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-[#1F6878] hover:bg-[#E4F0F2]/60"><ExternalLink className="h-4 w-4 text-[#1F6878]" /> View website</Link>
                      <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 border-t border-[#E4F0F2] px-4 py-2.5 text-left text-[12px] text-[#E95A35] hover:bg-[#E4F0F2]/60"><LogOut className="h-4 w-4" /> Sign out</button>
                    </div>
                  )}
                </div>
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


