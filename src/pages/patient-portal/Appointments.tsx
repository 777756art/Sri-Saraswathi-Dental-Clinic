import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, Loader2, MapPin, MessageCircle, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { PortalHeader } from "@/components/patient-portal/PortalHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { api, ApiError, statusTone, type Booking } from "@/lib/api";

function DateTile({ date }: { date: string }) {
  const [day, month] = date.split(" ");
  return (
    <div className="hidden h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary-50 text-foreground sm:flex">
      <span className="text-[15px] font-semibold leading-none">{day}</span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{month}</span>
    </div>
  );
}

const isUpcoming = (booking: Booking) => {
  if (booking.status === "completed" || booking.status === "cancelled" || booking.status === "no_show") return false;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return booking.date >= iso;
};

export default function PatientAppointmentsPage() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<string[]>([]);
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ bookings: Booking[] }>("/api/bookings/mine");
      setItems(data.bookings);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load your appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    api
      .get<{ slots: string[] }>("/api/meta")
      .then((data) => setSlots(data.slots))
      .catch(() => {});
  }, [load]);

  const visible = useMemo(
    () =>
      items.filter((apt) => {
        if (filter === "upcoming") return isUpcoming(apt);
        if (filter === "past") return !isUpcoming(apt);
        return true;
      }),
    [items, filter],
  );

  const openReschedule = (booking: Booking) => {
    setRescheduling(booking);
    setNewDate(booking.date);
    setNewTime(booking.time);
  };

  const handleReschedule = async () => {
    if (!rescheduling || !newDate || !newTime) {
      toast.error("Please choose a new date and time");
      return;
    }
    setSaving(true);
    try {
      const data = await api.patch<{ booking: Booking }>(`/api/bookings/${rescheduling.id}`, {
        date: newDate,
        time: newTime,
      });
      setItems((prev) => prev.map((apt) => (apt.id === rescheduling.id ? data.booking : apt)));
      toast.success(`Moved to ${data.booking.dateLabel} at ${data.booking.time}`);
      setRescheduling(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not reschedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    setSaving(true);
    try {
      const data = await api.patch<{ booking: Booking }>(`/api/bookings/${cancelling.id}`, {
        status: "cancelled",
      });
      setItems((prev) => prev.map((apt) => (apt.id === cancelling.id ? data.booking : apt)));
      toast.success("Appointment cancelled — the clinic has been informed.");
      setCancelling(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not cancel.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <PortalHeader
        eyebrow="Patient portal"
        title="My appointments"
        description="Everything you have booked, past and upcoming — synced with the clinic."
        actions={
          <Button asChild size="lg">
            <Link to="/booking">
              <Plus className="h-4 w-4" /> Book new
            </Link>
          </Button>
        }
      />

      <Modal
        isOpen={rescheduling !== null}
        onClose={() => setRescheduling(null)}
        title="Reschedule appointment"
        description="Choose a new date and time. The clinic is notified and the booking returns to pending."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="New date"
              type="date"
              required
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <Select
              label="New time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              options={slots.map((time) => ({ value: time, label: time }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleReschedule()} loading={saving}>
              <Calendar className="h-4 w-4" /> Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Cancel appointment?"
        description={cancelling ? `${cancelling.serviceLabel} · ${cancelling.dateLabel} at ${cancelling.time}` : ""}
      >
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          This frees the slot for someone else. You can book a new visit anytime — no cancellation fee.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCancelling(null)}>
            Keep appointment
          </Button>
          <Button variant="danger" onClick={() => void handleCancel()} loading={saving}>
            <X className="h-4 w-4" /> Cancel booking
          </Button>
        </div>
      </Modal>

      <section className="container-x py-10 md:py-12">
        <div className="flex rounded-full border border-border/80 bg-card p-1 shadow-soft max-w-fit">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-5 text-[13px] text-muted-foreground shadow-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your appointments…
            </div>
          )}

          {!loading &&
            visible.map((apt) => {
              const canChange = apt.status === "pending" || apt.status === "confirmed";
              return (
                <div
                  key={apt.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-shadow hover:shadow-card md:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <DateTile date={apt.dateLabel} />
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">{apt.serviceLabel}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {apt.dateLabel}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {apt.time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            Surampatti, Erode
                          </span>
                        </div>
                        <p className="mt-1.5 text-[12px] text-foreground/60">
                          {apt.dentist} · <span className="font-medium">{apt.ref}</span>
                        </p>
                        {apt.notes && <p className="mt-1 text-[12px] italic text-muted-foreground">“{apt.notes}”</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                      <Badge variant={statusTone[apt.status]}>{apt.statusLabel}</Badge>
                      {canChange && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openReschedule(apt)}>
                            Reschedule
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setCancelling(apt)}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {apt.whatsapp?.clinic && (
                        <a
                          href={apt.whatsapp.clinic}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Message the clinic about ${apt.ref}`}
                          className="rounded-full border border-emerald-200 p-2 text-emerald-600 transition-colors hover:bg-emerald-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {!loading && visible.length === 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-soft">
              <p className="font-display text-xl font-medium text-foreground">Nothing here yet</p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Book a visit and it will show up in this list, with live status updates from the clinic.
              </p>
              <Button asChild className="mt-5">
                <Link to="/booking">Book an appointment</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
