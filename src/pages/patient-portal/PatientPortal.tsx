import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  FileText,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { PortalHeader } from "@/components/patient-portal/PortalHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatsCard } from "@/components/ui/StatsCard";
import { useAuth } from "@/lib/use-auth";
import { api, statusTone, type Booking } from "@/lib/api";

const quickActions = [
  { label: "Book appointment", href: "/booking", icon: Calendar },
  { label: "My appointments", href: "/patient-portal/appointments", icon: Calendar },
  { label: "Contact clinic", href: "/patient-portal/messages", icon: MessageSquare },
];

function DateBadge({ date }: { date: string }) {
  const [day, month] = date.split(" ");
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary-800">
      <span className="text-[15px] font-semibold leading-none">{day}</span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-primary-600">{month}</span>
    </div>
  );
}

const isUpcoming = (booking: Booking) =>
  booking.status !== "completed" &&
  booking.status !== "cancelled" &&
  booking.status !== "no_show" &&
  booking.date >= new Date().toISOString().slice(0, 10);

export default function PatientPortalPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<{ bookings: Booking[] }>("/api/bookings/mine")
      .then((data) => {
        if (active) setBookings(data.bookings);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const upcoming = bookings
    .filter(isUpcoming)
    .sort((a, b) => (a.date === b.date ? 0 : a.date.localeCompare(b.date)))
    .slice(0, 3);
  const completed = bookings.filter((b) => b.status === "completed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <main className="min-h-screen bg-background">
      <PortalHeader
        eyebrow="Patient dashboard"
        title={
          <>
            Welcome back, <span className="italic text-primary-700">{user?.firstName ?? "there"}.</span>
          </>
        }
        description="Your appointments and messages in one calm place."
        actions={
          <Button asChild size="lg">
            <Link to="/booking">
              <Calendar className="h-4 w-4" /> Book a visit
            </Link>
          </Button>
        }
      />

      <section className="container-x space-y-10 py-10 md:py-12">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Quick actions
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
                  <action.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[12px] font-medium leading-tight text-foreground/80">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.5fr]">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-medium text-foreground">Upcoming appointments</h2>
              <Link
                to="/patient-portal/appointments"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-primary-700 hover:text-primary-800"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading && (
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-5 text-[13px] text-muted-foreground shadow-soft">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading your appointments…
                </div>
              )}

              {!loading &&
                upcoming.map((apt) => (
                  <Link
                    key={apt.id}
                    to="/patient-portal/appointments"
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:shadow-card"
                  >
                    <div className="flex items-center gap-4">
                      <DateBadge date={apt.dateLabel} />
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">{apt.serviceLabel}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {apt.dentist} · {apt.time}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">{apt.ref}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusTone[apt.status]} size="sm">
                        {apt.statusLabel}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}

              {!loading && upcoming.length === 0 && (
                <div className="rounded-2xl border border-border/70 bg-card p-6 text-center shadow-soft">
                  <p className="text-[14px] font-medium text-foreground">No upcoming visits</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    Book a check-up and it will appear here with live status updates.
                  </p>
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/booking">Book a visit</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-ink-950 p-6 text-white shadow-card">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
              <MessageCircle className="h-3 w-3 text-accent-300" /> Need to change something?
            </span>
            <p className="mt-3 font-display text-2xl font-medium tracking-tight">We&apos;re a message away.</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Reschedule, cancel or ask a question — the clinic replies on WhatsApp within minutes.
            </p>

            <Button asChild fullWidth size="sm" className="mt-6 bg-white text-ink-950 hover:bg-primary-50">
              <a
                href={`https://wa.me/919345743409?text=${encodeURIComponent("Hi Sri Saraswathi Dental Clinic, I need help with my appointment.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp the clinic
              </a>
            </Button>
            <a
              href="tel:+914244272494"
              className="mt-3 flex items-center justify-center gap-2 text-[12px] font-medium text-white/70 transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" /> 0424 427 2494
            </a>

            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-white/45">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-300" /> Mon–Sat · 9:00 AM – 8:45 PM
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total bookings" value={loading ? "—" : String(bookings.length)} icon={Calendar} variant="primary" />
          <StatsCard title="Upcoming" value={loading ? "—" : String(bookings.filter(isUpcoming).length)} icon={FileText} variant="success" />
          <StatsCard title="Completed visits" value={loading ? "—" : String(completed)} icon={ShieldCheck} variant="default" />
          <StatsCard title="Cancelled" value={loading ? "—" : String(cancelled)} icon={Calendar} variant="warning" />
        </div>
      </section>
    </main>
  );
}
