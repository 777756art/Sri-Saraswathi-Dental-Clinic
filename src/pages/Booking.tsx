import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  HeartHandshake,
  Loader2,
  MessageCircle,
  Phone,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useAuth } from "@/lib/use-auth";
import { api, ApiError, resolveApiAsset, type Availability, type Booking } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/seo/SEOHead";
import { getBreadcrumbSchema } from "@/components/seo/schemas";

export type TreatmentItem = {
  id: number;
  slug: string;
  treatment_name: string;
  short_description?: string;
  treatment_image_url?: string;
  duration_minutes?: number;
  price?: number;
};

export type DoctorItem = {
  id: number;
  name: string;
  qualification?: string;
  specialization: string;
  experience?: string;
  profile_image_url?: string;
  biography?: string;
};

const STEPS = [
  "Treatment",
  "Doctor",
  "Date",
  "Time Slot",
  "Patient Info",
  "Confirm",
  "Success",
];

const isoFor = (base: Date, day: number) =>
  `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// Asia/Kolkata date helper
const getTodayIST = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

export default function BookingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedService = searchParams.get("service") || "";
  const requestedDoctor = searchParams.get("doctor") || "";

  // Dynamic treatments and doctors
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Wizard state (Step 1 to 7)
  const [step, setStep] = useState(1);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentItem | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Availability state
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Patient info
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Load active treatments and doctors dynamically
  useEffect(() => {
    let mounted = true;
    setLoadingData(true);

    Promise.all([
      api.get<{ treatments: TreatmentItem[] }>("/api/treatments").catch(() => ({ treatments: [] })),
      api.get<{ doctors: DoctorItem[] }>("/api/doctors").catch(() => ({ doctors: [] })),
    ])
      .then(([treatRes, docRes]) => {
        if (!mounted) return;
        const validTreatments = (treatRes.treatments || []).filter((t) => t.treatment_name);
        const validDoctors = (docRes.doctors || []).filter((d) => d.name && !/test\s*\d+/i.test(d.name));
        setTreatments(validTreatments);
        setDoctors(validDoctors);

        // Pre-select treatment if in query params
        if (requestedService && validTreatments.length) {
          const match = validTreatments.find(
            (t) =>
              t.slug.toLowerCase() === requestedService.toLowerCase() ||
              t.treatment_name.toLowerCase().includes(requestedService.toLowerCase()),
          );
          if (match) setSelectedTreatment(match);
        }

        // Pre-select doctor if in query params
        if (requestedDoctor && validDoctors.length) {
          const match = validDoctors.find(
            (d) =>
              d.name.toLowerCase().includes(requestedDoctor.toLowerCase()) ||
              requestedDoctor.toLowerCase().includes(d.name.toLowerCase()),
          );
          if (match) setSelectedDoctor(match);
        }
      })
      .finally(() => {
        if (mounted) setLoadingData(false);
      });

    return () => {
      mounted = false;
    };
  }, [requestedService, requestedDoctor]);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
      setPatientName((prev) => prev || fullName);
      setPhone((prev) => prev || user.phone || "");
      setEmail((prev) => prev || user.email || "");
    }
  }, [user]);

  // Today in IST
  const todayIST = useMemo(() => getTodayIST(), []);
  const todayDateObj = useMemo(() => new Date(`${todayIST}T00:00:00`), [todayIST]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const selectedISO = selectedDay ? isoFor(currentMonth, selectedDay) : null;

  // Load availability when date, doctor, or treatment changes
  const fetchAvailability = async (isoDate: string, docId?: number, treatId?: number) => {
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams({ date: isoDate });
      if (docId) params.append("doctorId", String(docId));
      if (treatId) params.append("treatmentId", String(treatId));

      const data = await api.get<Availability>(`/api/availability?${params.toString()}`);
      setAvailability(data);
    } catch (err) {
      setAvailability(null);
      toast.error(err instanceof ApiError ? err.message : "Could not load slot availability. Please try another date.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSelectDate = (day: number) => {
    setSelectedDay(day);
    setSelectedTime(null);
    const iso = isoFor(currentMonth, day);
    fetchAvailability(iso, selectedDoctor?.id, selectedTreatment?.id);
    setStep(4);
  };

  const shiftMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    setSelectedDay(null);
    setSelectedTime(null);
    setAvailability(null);
  };

  const submitBooking = async () => {
    const cleanName = patientName.trim();
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      toast.error("Please enter patient's full name (at least 2 characters).");
      return;
    }
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!selectedTreatment) {
      toast.error("Please select a treatment.");
      setStep(1);
      return;
    }
    if (!selectedDoctor) {
      toast.error("Please select a doctor.");
      setStep(2);
      return;
    }
    if (!selectedISO || !selectedTime) {
      toast.error("Please select an appointment date and time.");
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<{ booking: Booking }>("/api/bookings", {
        patientName: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        treatmentId: selectedTreatment.id,
        doctorId: selectedDoctor.id,
        service: selectedTreatment.slug,
        dentist: selectedDoctor.name,
        date: selectedISO,
        time: selectedTime,
        notes: notes.trim(),
      });

      setConfirmedBooking(data.booking);
      setStep(7);
      window.dispatchEvent(new Event("bookings:changed"));
      toast.success("✅ Appointment successfully booked!");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message);
        setStep(4);
        if (selectedISO) {
          fetchAvailability(selectedISO, selectedDoctor.id, selectedTreatment.id);
        }
        setSelectedTime(null);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Could not complete booking. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedTreatment(null);
    setSelectedDoctor(null);
    setSelectedDay(null);
    setSelectedTime(null);
    setAvailability(null);
    setConfirmedBooking(null);
    setNotes("");
  };

  if (authLoading || loadingData) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FDFBF7]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1F6878]" />
          <p className="text-[13px] font-medium text-[#707574]">Loading dental appointment booking…</p>
        </div>
      </main>
    );
  }

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://drkishoredentist.com/" },
    { name: "Book Appointment", url: "https://drkishoredentist.com/booking" },
  ]);

  return (
    <>
      <SEOHead
        title="Book Dental Appointment Online in Erode | Sreesaraswathi Dental"
        description="Book your dental appointment online at Sreesaraswathi Dental Clinic in Erode. Select treatment, choose your dentist, and schedule a convenient date & time."
        canonical="https://drkishoredentist.com/booking"
        schema={[breadcrumbSchema]}
      />
      <main className="min-h-screen bg-[#FDFBF7]">
      <PageHero
        eyebrow="Sri Saraswathi Dental Clinic"
        align="center"
        title={
          <>
            Book an Appointment <span className="italic text-[#1F6878]">with Confidence.</span>
          </>
        }
        description="Select your treatment, choose your specialist dentist, and pick an available date & time. Confirmed directly with WhatsApp notifications."
        actions={
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#707574]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#E95A35]" /> Admin-Verified Doctors
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#1F6878]" /> Real-Time Live Availability
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#1F6878]" /> Instant WhatsApp Notification
            </span>
          </div>
        }
      />

      <section className="section-pad">
        <div className="container-x">
          <div className="mx-auto max-w-4xl">
            {/* Step Progress Indicators */}
            {step < 7 && (
              <div className="mb-6 sm:mb-8">
                {/* Mobile Compact Progress Bar (screens < 640px) */}
                <div className="sm:hidden rounded-2xl border border-[#1F6878]/15 bg-white p-3.5 shadow-sm mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1F6878]">
                    <span>Step {step} of 6</span>
                    <span className="text-[#E95A35]">{STEPS[step - 1]}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E4F0F2]">
                    <div
                      className="h-full bg-[#1F6878] transition-all duration-300"
                      style={{ width: `${(step / 6) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Tablet and Desktop Multi-step Row (screens >= 640px) */}
                <div className="hidden sm:block overflow-x-auto pb-2">
                  <div className="flex min-w-[620px] items-center justify-between gap-1 sm:gap-2">
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <div key={s} className="flex items-center gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (s < step) setStep(s);
                          }}
                          disabled={s > step}
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-all",
                            step === s
                              ? "bg-[#1F6878] text-white ring-4 ring-[#1F6878]/15"
                              : step > s
                                ? "bg-[#1F6878] text-white hover:opacity-90"
                                : "border border-[#1F6878]/20 bg-white text-[#707574]",
                          )}
                        >
                          {step > s ? <Check className="h-4 w-4" /> : s}
                        </button>
                        <span
                          className={cn(
                            "text-[12px] font-semibold transition-colors",
                            step === s ? "text-[#1F6878]" : step > s ? "text-[#1F6878]/80" : "text-[#707574]/70",
                          )}
                        >
                          {STEPS[s - 1]}
                        </span>
                        {s < 6 && (
                          <div
                            className={cn(
                              "h-0.5 w-3 shrink-0 sm:w-6 transition-colors",
                              step > s ? "bg-[#1F6878]" : "bg-[#1F6878]/15",
                            )}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main Booking Container */}
            <div className="rounded-3xl border border-[#1F6878]/15 bg-white p-4 sm:p-6 md:p-9 shadow-card">
              {/* STEP 1: SELECT TREATMENT */}
              {step === 1 && (
                <div className="animate-fade-in">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E95A35]">
                        Step 1 of 6
                      </span>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[#1F6878]">Select Dental Treatment</h2>
                      <p className="mt-1 text-[13px] text-[#707574]">
                        Choose the care or consultation you need. All treatments are maintained by clinic admin.
                      </p>
                    </div>
                  </div>

                  {!treatments.length ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-[#1F6878]/20 p-8 text-center text-[#707574]">
                      <Stethoscope className="mx-auto h-8 w-8 text-[#1F6878]/40 mb-2" />
                      <p className="text-[13px] font-medium">No active treatments found in database.</p>
                      <p className="mt-1 text-[11px] text-[#707574]">
                        Please add or activate treatments from Admin Treatment Management.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {treatments.map((t) => {
                        const isSelected = selectedTreatment?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTreatment(t);
                              setStep(2);
                            }}
                            className={cn(
                              "group relative flex flex-col justify-between cursor-pointer rounded-2xl border p-4 transition-all duration-200",
                              isSelected
                                ? "border-[#1F6878] bg-[#E4F0F2]/70 shadow-sm"
                                : "border-[#1F6878]/15 bg-white hover:-translate-y-0.5 hover:border-[#1F6878] hover:bg-[#E4F0F2]/30 hover:shadow-soft",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#E4F0F2] border border-[#1F6878]/15 grid place-items-center">
                                {t.treatment_image_url ? (
                                  <img
                                    src={resolveApiAsset(t.treatment_image_url)}
                                    alt={t.treatment_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Stethoscope className="h-6 w-6 text-[#1F6878]" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[14px] font-bold text-[#1F6878] group-hover:text-[#1F6878]">
                                  {t.treatment_name}
                                </h3>
                                {t.short_description && (
                                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[#707574]">
                                    {t.short_description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-[#1F6878]/10 pt-2.5 text-[11px] font-semibold text-[#1F6878]">
                              <span className="inline-flex items-center gap-1 text-[#707574]">
                                <Clock className="h-3 w-3 text-[#1F6878]" />
                                {t.duration_minutes ? `${t.duration_minutes} mins` : "30 mins"}
                              </span>
                              <span className="text-[#E95A35] font-bold group-hover:translate-x-0.5 transition-transform">
                                Select →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SELECT DOCTOR */}
              {step === 2 && (
                <div className="animate-fade-in">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E95A35]">
                        Step 2 of 6
                      </span>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[#1F6878]">Select Specialist Doctor</h2>
                      <p className="mt-1 text-[13px] text-[#707574]">
                        Choose your attending dentist. Only genuine active doctors from Doctor Management are shown.
                      </p>
                    </div>
                    {selectedTreatment && (
                      <span className="rounded-full bg-[#E4F0F2] px-3 py-1 text-[11px] font-semibold text-[#1F6878]">
                        {selectedTreatment.treatment_name}
                      </span>
                    )}
                  </div>

                  {!doctors.length ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-[#1F6878]/20 p-8 text-center text-[#707574]">
                      <User className="mx-auto h-8 w-8 text-[#1F6878]/40 mb-2" />
                      <p className="text-[13px] font-medium">No active doctors found.</p>
                      <p className="mt-1 text-[11px] text-[#707574]">
                        Please add or activate doctors in Admin Doctor Management.
                      </p>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "mt-6 grid gap-4",
                        doctors.length === 1
                          ? "max-w-md mx-auto grid-cols-1"
                          : doctors.length === 2
                            ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                      )}
                    >
                      {doctors.map((doc) => {
                        const isSelected = selectedDoctor?.id === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => {
                              setSelectedDoctor(doc);
                              setStep(3);
                            }}
                            className={cn(
                              "group relative flex flex-col justify-between cursor-pointer rounded-2xl border p-5 transition-all duration-200 text-center items-center",
                              isSelected
                                ? "border-[#1F6878] bg-[#E4F0F2]/70 shadow-sm"
                                : "border-[#1F6878]/15 bg-white hover:-translate-y-0.5 hover:border-[#1F6878] hover:bg-[#E4F0F2]/30 hover:shadow-soft",
                            )}
                          >
                            <div className="relative mb-3 h-20 w-20 overflow-hidden rounded-full border-2 border-[#1F6878]/20 bg-[#E4F0F2] shadow-inner">
                              {doc.profile_image_url ? (
                                <img
                                  src={resolveApiAsset(doc.profile_image_url)}
                                  alt={doc.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-[#1F6878]">
                                  <User className="h-10 w-10" />
                                </div>
                              )}
                            </div>

                            <h3 className="font-display text-[15px] font-bold text-[#1F6878]">{doc.name}</h3>
                            <p className="mt-0.5 text-[11.5px] font-semibold text-[#E95A35]">
                              {doc.specialization}
                            </p>
                            {doc.qualification && (
                              <p className="mt-0.5 text-[11px] text-[#707574]">{doc.qualification}</p>
                            )}
                            {doc.experience && (
                              <span className="mt-2 rounded-full bg-[#E4F0F2] px-2.5 py-0.5 text-[10px] font-semibold text-[#1F6878]">
                                {doc.experience}
                              </span>
                            )}

                            <div className="mt-4 w-full border-t border-[#1F6878]/10 pt-3">
                              <span className="block text-center text-[11px] font-bold text-[#1F6878] group-hover:text-[#E95A35] transition-colors">
                                Book with {doc.name.split(" ")[0] || "Doctor"} →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SELECT DATE */}
              {step === 3 && (
                <div className="animate-fade-in">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E95A35]">
                        Step 3 of 6
                      </span>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[#1F6878]">Select Appointment Date</h2>
                      <p className="mt-1 text-[13px] text-[#707574]">
                        Clinic Timezone: <strong className="text-[#1F6878]">Asia/Kolkata (IST)</strong>. Past dates are strictly disabled.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTreatment && (
                        <span className="rounded-full bg-[#E4F0F2] px-3 py-1 text-[11px] font-semibold text-[#1F6878]">
                          {selectedTreatment.treatment_name}
                        </span>
                      )}
                      {selectedDoctor && (
                        <span className="rounded-full bg-[#E4F0F2] px-3 py-1 text-[11px] font-semibold text-[#1F6878]">
                          {selectedDoctor.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mx-auto mt-6 max-w-md rounded-2xl border border-[#1F6878]/15 bg-white p-3.5 sm:p-5 shadow-soft">
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        aria-label="Previous month"
                        className="rounded-full p-2 text-[#707574] transition-colors hover:bg-[#E4F0F2] hover:text-[#1F6878]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-[14px] font-bold text-[#1F6878]">{monthLabel}</span>
                      <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        aria-label="Next month"
                        className="rounded-full p-2 text-[#707574] transition-colors hover:bg-[#E4F0F2] hover:text-[#1F6878]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <div key={d} className="py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#707574]">
                          {d}
                        </div>
                      ))}
                      {Array.from({ length: firstDayOfMonth }, (_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = isoFor(currentMonth, day);
                        const dateObj = new Date(`${dateStr}T00:00:00`);
                        const isPast = dateStr < todayIST;
                        const isSunday = dateObj.getDay() === 0;
                        const isDisabled = isPast || isSunday;

                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={isDisabled}
                            title={isSunday ? "Closed on Sundays" : isPast ? "Past date" : undefined}
                            onClick={() => handleSelectDate(day)}
                            className={cn(
                              "flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 mx-auto items-center justify-center rounded-full text-[12px] sm:text-[13px] font-medium transition-all",
                              selectedDay === day
                                ? "bg-[#1F6878] font-bold text-white shadow-sm"
                                : isDisabled
                                  ? "cursor-not-allowed text-[#707574]/35"
                                  : "text-[#1F6878] hover:bg-[#E4F0F2] hover:font-bold",
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#1F6878]/10 pt-3 text-[11px] text-[#707574]">
                      <span>Clinic open Mon–Sat</span>
                      <span className="font-semibold text-[#E95A35]">Closed Sundays</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: SELECT AVAILABLE TIME SLOT */}
              {step === 4 && (
                <div className="animate-fade-in">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E95A35]">
                        Step 4 of 6
                      </span>
                      <h2 className="mt-1 font-display text-2xl font-bold text-[#1F6878]">Select Available Time</h2>
                      <p className="mt-1 text-[13px] text-[#707574]">
                        Date: <strong className="text-[#1F6878]">{selectedISO}</strong> with{" "}
                        <strong className="text-[#1F6878]">{selectedDoctor?.name}</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="text-[12px] font-semibold text-[#1F6878] hover:underline"
                    >
                      ← Change Date
                    </button>
                  </div>

                  <div className="mt-6">
                    {slotsLoading ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1F6878]/20 p-12 text-[#707574]">
                        <Loader2 className="h-6 w-6 animate-spin text-[#1F6878] mb-2" />
                        <p className="text-[13px]">Checking live availability for {selectedISO}…</p>
                      </div>
                    ) : availability?.closed ? (
                      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-8 text-center text-amber-900">
                        <Clock className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                        <h3 className="font-display text-[16px] font-bold">
                          {availability.reason || "Appointments are unavailable on this date."}
                        </h3>
                        <p className="mt-1 text-[12px] text-amber-800/80">
                          Please select another day from the calendar.
                        </p>
                        <Button className="mt-4" variant="outline" onClick={() => setStep(3)}>
                          Pick another date
                        </Button>
                      </div>
                    ) : availability?.slots && availability.slots.length > 0 ? (
                      <div>
                        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[#1F6878]">
                          Available Appointment Slots
                        </p>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                          {availability.slots.map((slot) => {
                            const isSelected = selectedTime === slot.time;
                            return (
                              <button
                                key={slot.time}
                                type="button"
                                onClick={() => {
                                  setSelectedTime(slot.time);
                                  setStep(5);
                                }}
                                className={cn(
                                  "rounded-xl border px-3 py-3 text-center text-[13px] font-semibold transition-all",
                                  isSelected
                                    ? "border-[#1F6878] bg-[#1F6878] text-white shadow-sm"
                                    : "border-[#1F6878]/20 bg-white text-[#1F6878] hover:border-[#1F6878] hover:bg-[#E4F0F2]",
                                )}
                              >
                                {slot.time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#1F6878]/20 p-8 text-center text-[#707574]">
                        <Clock className="mx-auto h-8 w-8 text-[#1F6878]/40 mb-2" />
                        <p className="text-[14px] font-medium text-[#1F6878]">
                          No available appointments for this date.
                        </p>
                        <p className="mt-1 text-[12px] text-[#707574]">
                          All slots for this day have already passed or have been booked. Please choose another date.
                        </p>
                        <Button className="mt-4" variant="outline" onClick={() => setStep(3)}>
                          Pick another date
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: PATIENT INFORMATION */}
              {step === 5 && (
                <div className="animate-fade-in">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E95A35]">
                    Step 5 of 6
                  </span>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#1F6878]">Patient Information</h2>
                  <p className="mt-1 text-[13px] text-[#707574]">
                    Enter your contact details so the clinic can confirm your booking and send WhatsApp updates.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Patient Full Name"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                    <Input
                      label="Mobile Number (WhatsApp)"
                      required
                      type="tel"
                      placeholder="10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      helperText="Booking confirmation will be prepared for this number."
                    />
                    <div className="sm:col-span-2">
                      <Input
                        label="Email Address (Optional)"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <TextArea
                        label="Dental Concern or Notes (Optional)"
                        rows={3}
                        placeholder="Describe your tooth pain, preferred procedure, or any questions for the doctor…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Summary preview chip */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1F6878]/15 bg-[#E4F0F2]/50 px-4 py-3 text-[12px] text-[#1F6878]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{selectedTreatment?.treatment_name}</span>
                      <span>·</span>
                      <span>{selectedDoctor?.name}</span>
                      <span>·</span>
                      <span>{selectedISO} at {selectedTime}</span>
                    </div>
                    <span className="font-semibold text-[#E95A35]">Ready to review</span>
                  </div>
                </div>
              )}

              {/* STEP 6: CONFIRM APPOINTMENT */}
              {step === 6 && (
                <div className="animate-fade-in">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E95A35]">
                    Step 6 of 6
                  </span>
                  <h2 className="mt-1 font-display text-2xl font-bold text-[#1F6878]">Confirm Appointment</h2>
                  <p className="mt-1 text-[13px] text-[#707574]">
                    Please review your booking details before final confirmation.
                  </p>

                  <div className="mt-6 divide-y divide-[#1F6878]/10 rounded-2xl border border-[#1F6878]/15 bg-[#E4F0F2]/30 p-5">
                    <div className="flex items-center justify-between py-2.5 text-[13px]">
                      <span className="text-[#707574]">Treatment</span>
                      <span className="font-bold text-[#1F6878]">{selectedTreatment?.treatment_name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-[13px]">
                      <span className="text-[#707574]">Specialist Doctor</span>
                      <span className="font-bold text-[#1F6878]">{selectedDoctor?.name} ({selectedDoctor?.specialization})</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-[13px]">
                      <span className="text-[#707574]">Appointment Date</span>
                      <span className="font-bold text-[#1F6878]">
                        {selectedISO
                          ? new Date(`${selectedISO}T00:00:00`).toLocaleDateString("en-IN", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-[13px]">
                      <span className="text-[#707574]">Time Slot</span>
                      <span className="font-bold text-[#1F6878]">{selectedTime}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-[13px]">
                      <span className="text-[#707574]">Patient</span>
                      <span className="font-bold text-[#1F6878]">{patientName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-[13px]">
                      <span className="text-[#707574]">Phone (WhatsApp)</span>
                      <span className="font-bold text-[#1F6878]">{phone}</span>
                    </div>
                    {email && (
                      <div className="flex items-center justify-between py-2.5 text-[13px]">
                        <span className="text-[#707574]">Email</span>
                        <span className="font-bold text-[#1F6878]">{email}</span>
                      </div>
                    )}
                    {notes && (
                      <div className="py-2.5 text-[13px]">
                        <span className="text-[#707574] block">Notes:</span>
                        <span className="font-medium text-[#1F6878]">{notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-[#E4F0F2] p-4 text-[12px] text-[#1F6878]">
                    <p className="font-semibold">Notice:</p>
                    <p className="mt-0.5 text-[#707574]">
                      Appointments are scheduled and reviewed by our clinical team. You will receive an immediate confirmation token and live WhatsApp notifications.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 7: BOOKING SUCCESS */}
              {step === 7 && confirmedBooking && (
                <div className="animate-fade-in text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E4F0F2] text-[#1F6878] shadow-soft">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold text-[#1F6878]">
                    Appointment Request Received!
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-[13.5px] text-[#707574]">
                    Your appointment has been registered under reference token{" "}
                    <strong className="text-[#1F6878] font-bold">{confirmedBooking.ref}</strong>.
                  </p>

                  <div className="mx-auto mt-6 max-w-md divide-y divide-[#1F6878]/10 rounded-2xl border border-[#1F6878]/15 bg-[#E4F0F2]/40 p-5 text-left text-[13px]">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#707574]">Reference ID</span>
                      <span className="font-bold text-[#1F6878]">{confirmedBooking.ref}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#707574]">Treatment</span>
                      <span className="font-bold text-[#1F6878]">{confirmedBooking.serviceLabel}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#707574]">Doctor</span>
                      <span className="font-bold text-[#1F6878]">{confirmedBooking.dentist}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#707574]">Date & Time</span>
                      <span className="font-bold text-[#1F6878]">
                        {confirmedBooking.dateLabel} at {confirmedBooking.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#707574]">Patient</span>
                      <span className="font-bold text-[#1F6878]">{confirmedBooking.patientName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#707574]">Status</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        {confirmedBooking.statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
                    {confirmedBooking.whatsapp?.patient && (
                      <Button asChild size="lg" className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white">
                        <a href={confirmedBooking.whatsapp.patient} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" /> Open Confirmation in WhatsApp
                        </a>
                      </Button>
                    )}
                    {confirmedBooking.whatsapp?.clinic && (
                      <Button asChild variant="outline" size="lg" className="w-full border-[#1F6878]/25 text-[#1F6878]">
                        <a href={confirmedBooking.whatsapp.clinic} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="h-4 w-4" /> Message Clinic Front Desk
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Button variant="outline" onClick={resetFlow}>
                      Book another appointment
                    </Button>
                    <Button onClick={() => navigate("/")}>Return to Home</Button>
                  </div>
                </div>
              )}

              {/* Navigation Footer (Steps 1 to 6) */}
              {step < 7 && (
                <div className="mt-8 flex items-center justify-between border-t border-[#1F6878]/10 pt-5">
                  {step > 1 ? (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="border-[#1F6878]/20 text-[#1F6878]"
                    >
                      ← Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step === 5 && (
                    <Button
                      type="button"
                      onClick={() => {
                        if (!patientName.trim() || patientName.trim().length < 2) {
                          toast.error("Please enter patient name.");
                          return;
                        }
                        if (phone.replace(/\D/g, "").length < 10) {
                          toast.error("Please enter a valid 10-digit mobile number.");
                          return;
                        }
                        setStep(6);
                      }}
                    >
                      Review & Confirm →
                    </Button>
                  )}

                  {step === 6 && (
                    <Button
                      type="button"
                      loading={submitting}
                      onClick={submitBooking}
                      className="bg-[#1F6878] hover:bg-[#185360] text-white font-bold"
                    >
                      Confirm & Book Visit
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Assistance banner */}
            <p className="mt-6 text-center text-[12px] text-[#707574]">
              Need immediate emergency dental care? Call Sri Saraswathi Dental Clinic directly at{" "}
              <a href="tel:04244272494" className="font-bold text-[#1F6878] hover:underline">
                0424 427 2494
              </a>{" "}
              or WhatsApp{" "}
              <a href="https://wa.me/919345743409" className="font-bold text-[#1F6878] hover:underline">
                +91 93457 43409
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
