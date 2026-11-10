import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { useAuth } from "@/lib/use-auth";
import { api, ApiError, type Availability, type Booking } from "@/lib/api";
import { cn } from "@/lib/utils";

type Meta = {
  services: { value: string; label: string }[];
  dentists: string[];
  slots: string[];
};

const steps = ["Service", "Date & time", "Your info", "Confirm"];

const isoFor = (base: Date, day: number) =>
  `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export default function BookingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedService = searchParams.get("service") || "";
  const requestedDoctor = searchParams.get("doctor") || "";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [step, setStep] = useState(1);
  const [service, setService] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [details, setDetails] = useState({ phone: "", email: "", dob: "", dentist: "", source: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  useEffect(() => {
    api
      .get<Meta>("/api/meta")
      .then((data) => {
        setMeta(data);
        setDetails((prev) => ({ ...prev, phone: user?.phone ?? prev.phone, email: user?.email ?? prev.email }));
        const requested = requestedService
          ? data.services.find((item) => item.value === requestedService || item.label.toLowerCase() === requestedService.toLowerCase())
          : undefined;
        if (requested) {
          setService(requested.value);
          setStep(2);
        }
        const requestedDentist = requestedDoctor
          ? data.dentists.find((name) => name.toLowerCase() === requestedDoctor.toLowerCase())
          : undefined;
        if (requestedDentist) setDetails((prev) => ({ ...prev, dentist: requestedDentist }));
      })
      .catch(() => toast.error("Could not load booking options. Please refresh."));
  }, [user, requestedService, requestedDoctor]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const serviceLabel = meta?.services.find((s) => s.value === service)?.label ?? "";
  const selectedISO = selectedDay ? isoFor(currentMonth, selectedDay) : null;

  const selectDate = async (day: number) => {
    setSelectedDay(day);
    setSelectedTime(null);
    const iso = isoFor(currentMonth, day);
    setSlotsLoading(true);
    try {
      const data = await api.get<Availability>(`/api/availability?date=${iso}`);
      setAvailability(data);
    } catch {
      setAvailability(null);
      toast.error("Could not load availability. Please try another date.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const shiftMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    setSelectedDay(null);
    setSelectedTime(null);
    setAvailability(null);
  };

  const canContinue =
    step === 1
      ? Boolean(service)
      : step === 2
        ? Boolean(selectedDay && selectedTime)
        : true;

  const submit = async () => {
    const phone = details.phone.trim();
    const email = details.email.trim();
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<{ booking: Booking }>("/api/bookings", {
        service,
        date: selectedISO,
        time: selectedTime,
        phone,
        email,
        dob: details.dob,
        dentist: details.dentist,
        source: details.source,
        notes: details.notes,
      });
      setConfirmed(data.booking);
      setStep(4);
      window.dispatchEvent(new Event("bookings:changed"));
      toast.success("Appointment booked — confirmation ready on WhatsApp");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message);
        setStep(2);
        if (selectedISO) {
          const data = await api.get<Availability>(`/api/availability?date=${selectedISO}`).catch(() => null);
          setAvailability(data);
        }
        setSelectedTime(null);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Could not book the appointment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setService(null);
    setSelectedDay(null);
    setSelectedTime(null);
    setAvailability(null);
    setConfirmed(null);
    setDetails((prev) => ({ ...prev, notes: "", dob: "", source: "", dentist: "" }));
  };

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to={`/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return (
    <main className="min-h-screen bg-background">
      <PageHero
        eyebrow="Appointment request"
        align="center"
        title={
          <>
            Plan your visit <span className="italic text-primary-700">with confidence.</span>
          </>
        }
        description="Choose a treatment and preferred time. The clinic team will review availability and confirm your appointment."
        actions={
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Choose a preferred time
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary-600" /> Clinic team confirms availability
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary-600" /> Open Mon–Sat
            </span>
          </div>
        }
      />

      <section className="section-pad">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium transition-colors",
                      step >= s
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground",
                    )}
                  >
                    {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                  </div>
                  <span
                    className={cn(
                      "hidden text-[13px] md:inline",
                      step >= s ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {steps[s - 1]}
                  </span>
                  {s < 4 && (
                    <div className={cn("h-px w-4 shrink-0 sm:w-8", step > s ? "bg-primary-500" : "bg-border")} />
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card md:p-9">
              {step === 1 && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-2xl font-medium text-foreground">What brings you in?</h2>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    Booking as <span className="font-medium text-foreground">{user.firstName} {user.lastName}</span>. Pick
                    the closest option — we can adjust later.
                  </p>
                  {!meta ? (
                    <div className="mt-8 flex items-center gap-3 text-[13px] text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {meta.services.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => {
                            setService(s.value);
                            setStep(2);
                          }}
                          className={cn(
                            "rounded-xl border px-4 py-3.5 text-left text-[13px] font-medium transition-all",
                            service === s.value
                              ? "border-primary-600 bg-primary-50 text-primary-800"
                              : "border-border text-foreground/80 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/50 hover:shadow-soft",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="animate-fade-in">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-medium text-foreground">Pick a date & time</h2>
                      <p className="mt-1.5 text-[13px] text-muted-foreground">
                        Live availability — reserved slots disappear instantly.
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary-50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      {serviceLabel}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-8 md:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => shiftMonth(-1)}
                          aria-label="Previous month"
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary-100 hover:text-foreground"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-[13px] font-semibold text-foreground">{monthLabel}</span>
                        <button
                          type="button"
                          onClick={() => shiftMonth(1)}
                          aria-label="Next month"
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary-100 hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                          <div
                            key={d}
                            className="py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            {d}
                          </div>
                        ))}
                        {Array.from({ length: firstDayOfMonth }, (_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const day = i + 1;
                          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                          const isPast = date < today;
                          const isClosed = date.getDay() === 0;
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={isPast || isClosed}
                              title={isClosed ? "Closed on Sundays" : undefined}
                              onClick={() => void selectDate(day)}
                              className={cn(
                                "flex h-9 items-center justify-center rounded-full text-[13px] transition-colors",
                                selectedDay === day
                                  ? "bg-primary font-medium text-primary-foreground"
                                  : isPast || isClosed
                                    ? "cursor-not-allowed text-muted-foreground/35"
                                    : "text-foreground/80 hover:bg-primary-50 hover:text-primary-700",
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Closed on Sundays · slots hold 2 patients each.
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Available times
                      </p>
                      {!selectedDay && (
                        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted-foreground">
                          Choose a date to see live slots.
                        </p>
                      )}
                      {selectedDay && slotsLoading && (
                        <div className="flex items-center gap-2 px-1 py-3 text-[12.5px] text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                        </div>
                      )}
                      {selectedDay && !slotsLoading && availability && !availability.closed && (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-2">
                          {availability.slots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={slot.remaining === 0}
                              onClick={() => setSelectedTime(slot.time)}
                              title={slot.remaining === 0 ? "Fully booked" : `${slot.remaining} slot${slot.remaining === 1 ? "" : "s"} left`}
                              className={cn(
                                "rounded-full border px-2 py-2 text-[12px] transition-colors",
                                selectedTime === slot.time
                                  ? "border-primary-600 bg-primary-50 font-medium text-primary-800"
                                  : slot.remaining === 0
                                    ? "cursor-not-allowed border-border/60 text-muted-foreground/40 line-through"
                                    : "border-border text-foreground/70 hover:border-primary-300 hover:bg-primary-50/60",
                              )}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedDay && !slotsLoading && availability?.closed && (
                        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted-foreground">
                          We&apos;re closed that day. Please pick another date.
                        </p>
                      )}
                      <div className="mt-5">
                        <Select
                          label="Preferred dentist (optional)"
                          placeholder="Any available dentist"
                          value={details.dentist}
                          onChange={(e) => setDetails({ ...details, dentist: e.target.value })}
                          options={(meta?.dentists ?? []).map((name) => ({ value: name, label: name }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-2xl font-medium text-foreground">A few details</h2>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    We use these to confirm your visit and send WhatsApp updates.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Input label="Patient" value={`${user.firstName} ${user.lastName}`} disabled />
                    <Input
                      label="Phone (WhatsApp)"
                      type="tel"
                      required
                      value={details.phone}
                      onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                      placeholder="98765 43210"
                    />
                    <Input
                      label="Email"
                      type="email"
                      required
                      value={details.email}
                      onChange={(e) => setDetails({ ...details, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                    <Input
                      label="Date of birth"
                      type="date"
                      value={details.dob}
                      onChange={(e) => setDetails({ ...details, dob: e.target.value })}
                    />
                    <div className="sm:col-span-2">
                      <Select
                        label="How did you hear about us?"
                        placeholder="Select one"
                        value={details.source}
                        onChange={(e) => setDetails({ ...details, source: e.target.value })}
                        options={[
                          { value: "google", label: "Google Search" },
                          { value: "social", label: "Social Media" },
                          { value: "referral", label: "Friend / Family" },
                          { value: "reviews", label: "Review sites" },
                          { value: "walk-in", label: "Walk-in" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <TextArea
                        label="Notes (optional)"
                        placeholder="Any special concerns or requests…"
                        value={details.notes}
                        onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl border border-border/70 bg-secondary-50/60 px-4 py-3 text-[12.5px] text-foreground/75">
                    <span className="font-medium text-foreground">{serviceLabel}</span> ·{" "}
                    {selectedISO
                      ? new Date(`${selectedISO}T00:00:00`).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}{" "}
                    at {selectedTime} · {details.dentist || "First available dentist"}
                  </div>
                </div>
              )}

              {step === 4 && confirmed && (
                <div className="animate-fade-in text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-medium text-foreground">You&apos;re booked</h2>
                  <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
                    Booking <span className="font-semibold text-foreground">{confirmed.ref}</span> is saved. The clinic
                    has been notified — send the confirmation on WhatsApp so it&apos;s in your chat too.
                  </p>

                  <div className="mx-auto mt-6 max-w-sm divide-y divide-border/70 rounded-2xl border border-border/70 bg-secondary-50/60 px-5 text-left">
                    {[
                      { label: "Service", value: confirmed.serviceLabel },
                      { label: "Date", value: confirmed.dateLabel },
                      { label: "Time", value: confirmed.time },
                      { label: "Dentist", value: confirmed.dentist },
                      { label: "Patient", value: confirmed.patientName },
                      { label: "Status", value: confirmed.statusLabel },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-[13px]">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="text-right font-medium text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5">
                    {confirmed.whatsapp?.patient && (
                      <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <a href={confirmed.whatsapp.patient} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" /> Send confirmation on WhatsApp
                        </a>
                      </Button>
                    )}
                    {confirmed.whatsapp?.clinic && (
                      <Button asChild variant="outline" size="lg">
                        <a href={confirmed.whatsapp.clinic} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" /> Message the clinic
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="mx-auto mt-4 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">
                    Your appointment shows as <span className="font-medium text-foreground">pending</span> until the
                    clinic confirms it. You&apos;ll see status updates in your patient portal.
                  </div>
                </div>
              )}

              {step < 4 && (
                <div className="mt-8 flex items-center justify-between border-t border-border/70 pt-6">
                  {step > 1 ? (
                    <Button variant="outline" type="button" onClick={() => setStep(step - 1)}>
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button
                    type="button"
                    onClick={() => (step === 3 ? void submit() : setStep(step + 1))}
                    disabled={!canContinue || submitting}
                    loading={submitting}
                  >
                    {step === 3 ? "Confirm booking" : "Continue"}
                  </Button>
                </div>
              )}
              {step === 4 && (
                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                  <Button fullWidth variant="outline" onClick={reset}>
                    Book another appointment
                  </Button>
                  <Button fullWidth onClick={() => navigate("/patient-portal/appointments")}>
                    View my appointments
                  </Button>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              Need to reschedule? Free up to 24 hours before your visit —{" "}
              <Link to="/patient-portal/appointments" className="font-medium text-primary-700 hover:underline">
                manage from your portal
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
