import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  List,
  Loader2,
  MessageCircle,
  Phone,
  Mail,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  X,
  CalendarClock,
  MessageSquare,
  Send,
  BellRing,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { api, ApiError, statusTone, type Booking, type BookingStatus } from "@/lib/api";

type Meta = {
  services: { value: string; label: string }[];
  dentists: string[];
  slots: string[];
};

const emptyForm = {
  patientName: "",
  patientPhone: "",
  patientEmail: "",
  service: "general-dentistry",
  date: "",
  time: "9:00 AM",
  dentist: "",
};

type CalendarMode = "day" | "week" | "month";
type WorkingDay = { day: string; enabled: boolean; start: string; end: string; breaks: { start: string; end: string }[] };
type BlockedDate = { id: string; date: string; type: "full" | "range"; start: string; end: string; reason: string; notes: string; dentist?: string };
type AvailabilitySettings = { weeklyHours: WorkingDay[]; appointmentDuration: number; maxPatientsPerSlot: number; blockedDates: BlockedDate[] };

const defaultAvailability: AvailabilitySettings = {
  weeklyHours: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
    day,
    enabled: day !== "Sunday",
    start: day === "Saturday" ? "09:00" : "09:30",
    end: day === "Saturday" ? "14:00" : "18:30",
    breaks: [],
  })),
  appointmentDuration: 30,
  maxPatientsPerSlot: 1,
  blockedDates: [],
};

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const hourFromTime = (value: string) => {
  const match = value.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
  if (!match) return -1;
  let hour = Number(match[1]) % 12;
  if (match[2].toUpperCase() === "PM") hour += 12;
  return hour;
};

function AppointmentCalendar({ bookings, onBlock }: { bookings: Booking[]; onBlock: (type: "full" | "range") => void }) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const todayKey = dateKey(new Date());
  const days = useMemo(() => {
    if (mode === "day") return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())];
    if (mode === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
      return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
    return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [anchor, mode]);
  const rangeLabel = mode === "month"
    ? anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : mode === "day"
      ? anchor.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : `${days[0]?.toLocaleDateString("en-IN", { month: "long", day: "numeric" })} – ${days[6]?.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}`;
  const todayAppointments = bookings.filter((booking) => booking.date === todayKey);
  const nextAppointment = [...bookings].filter((booking) => booking.date >= todayKey && booking.status !== "cancelled").sort((a, b) => a.date.localeCompare(b.date) || hourFromTime(a.time) - hourFromTime(b.time))[0];
  const moveAnchor = (direction: -1 | 1) => {
    const next = new Date(anchor);
    if (mode === "month") next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * (mode === "week" ? 7 : 1));
    setAnchor(next);
  };
  const times = Array.from({ length: 10 }, (_, index) => index + 9);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveAnchor(-1)} aria-label="Previous period" className="grid h-9 w-9 place-items-center rounded-lg border border-[#1F6878]/20 bg-white text-[#1F6878] hover:bg-[#E4F0F2]"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAnchor(new Date())} className="h-9 rounded-lg border border-[#1F6878]/20 bg-white px-4 text-[11px] font-semibold text-[#1F6878] hover:bg-[#E4F0F2]">Today</button>
          <button type="button" onClick={() => moveAnchor(1)} aria-label="Next period" className="grid h-9 w-9 place-items-center rounded-lg border border-[#1F6878]/20 bg-white text-[#1F6878] hover:bg-[#E4F0F2]"><ChevronRight className="h-4 w-4" /></button>
          <h2 className="ml-1 text-[13px] font-semibold text-[#1F6878] sm:text-[14px]">{rangeLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#1F6878]/20 bg-white p-1">
            {(["day", "week", "month"] as const).map((value) => <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`rounded-md px-3 py-1.5 text-[11px] font-medium capitalize transition ${mode === value ? "bg-[#1F6878] text-white" : "text-[#707574] hover:bg-[#E4F0F2] hover:text-[#1F6878]"}`}>{value}</button>)}
          </div>
          <button type="button" onClick={() => onBlock("range")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1F6878]/20 bg-white px-3 text-[11px] font-semibold text-[#1F6878] hover:bg-[#E4F0F2]"><Clock3 className="h-3.5 w-3.5 text-[#1F6878]" /> Block time</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-[16px] border border-[#1F6878]/15 bg-white px-5 py-4 shadow-soft">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#1F6878]">Today&apos;s appointments</p><p className="mt-1 font-display text-[18px] font-bold text-[#1F6878]">{todayAppointments.length} appointments</p><p className="mt-1 text-[10.5px] text-[#707574]">{todayAppointments.filter((item) => item.status === "confirmed").length} confirmed · {todayAppointments.filter((item) => item.status === "pending").length} new</p></div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878]"><Calendar className="h-4 w-4" /></span>
        </div>
        <div className="flex items-center justify-between rounded-[16px] border border-[#1F6878]/15 bg-white px-5 py-4 shadow-soft">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#1F6878]">Next up {nextAppointment ? `(${nextAppointment.time})` : ""}</p><p className="mt-1 font-display text-[18px] font-bold text-[#1F6878]">{nextAppointment?.patientName ?? "No upcoming appointments"}</p><p className="mt-1 text-[10.5px] text-[#707574]">{nextAppointment ? `${nextAppointment.serviceLabel} · ${nextAppointment.dentist}` : "New bookings appear here automatically"}</p></div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878]"><ChevronRight className="h-4 w-4" /></span>
        </div>
      </div>

      {mode === "month" ? (
        <div className="overflow-hidden rounded-[18px] border border-[#1F6878]/15 bg-white shadow-soft">
          <div className="grid grid-cols-7 border-b border-[#E4F0F2] bg-[#F5F2EB] text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#707574]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="py-3">{day}</span>)}</div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const key = dateKey(date);
              const dayBookings = bookings.filter((booking) => booking.date === key);
              return <button key={key} type="button" onClick={() => { setAnchor(date); setMode("day"); }} className={`min-h-[92px] border-b border-r border-[#E4F0F2]/70 p-2 text-left transition hover:bg-[#E4F0F2]/35 ${date.getMonth() !== anchor.getMonth() ? "bg-[#F5F2EB] text-[#707574]/50" : "text-[#1F6878]"}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${key === todayKey ? "bg-[#1F6878] text-white" : ""}`}>{date.getDate()}</span>{dayBookings.slice(0, 2).map((booking) => <span key={booking.id} className="mt-1 block truncate rounded bg-[#E4F0F2] px-1.5 py-1 text-[9px] font-medium text-[#1F6878]">{booking.time} · {booking.patientName}</span>)}{dayBookings.length > 2 && <span className="mt-1 block text-[9px] text-[#707574]">+{dayBookings.length - 2} more</span>}</button>;
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[18px] border border-[#1F6878]/15 bg-white shadow-soft">
          <div className="min-w-[850px]">
            <div className="grid border-b border-[#E4F0F2] bg-[#F5F2EB]" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
              <span />
              {days.map((date) => <div key={dateKey(date)} className="py-3 text-center"><span className="block text-[9px] font-bold uppercase text-[#707574]">{date.toLocaleDateString("en-US", { weekday: "short" })}</span><span className={`mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${dateKey(date) === todayKey ? "bg-[#1F6878] text-white" : "text-[#1F6878]"}`}>{date.getDate()}</span></div>)}
            </div>
            <div className="divide-y divide-[#E4F0F2]/70">
              {times.map((hour) => <div key={hour} className="grid min-h-[58px]" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
                <div className="px-3 pt-3 text-[10px] font-medium tabular-nums text-[#707574]">{String(hour % 12 || 12).padStart(2, "0")}:00</div>
                {days.map((date) => {
                  const key = dateKey(date);
                  const appointments = bookings.filter((booking) => booking.date === key && hourFromTime(booking.time) === hour && booking.status !== "cancelled");
                  return <div key={`${key}-${hour}`} className="border-l border-[#E4F0F2]/70 p-1.5">{appointments.map((booking) => <div key={booking.id} className={`rounded-lg border-l-[3px] px-2 py-2 ${booking.status === "pending" ? "border-[#E95A35] bg-[#E4F0F2]/60" : "border-[#1F6878] bg-[#E4F0F2]"}`}><p className="truncate text-[9px] font-bold text-[#1F6878]">{booking.time} · {booking.patientName}</p><p className="mt-0.5 truncate text-[8px] text-[#707574]">{booking.serviceLabel} · {booking.dentist}</p></div>)}</div>;
                })}
              </div>)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4F0F2] bg-[#F5F2EB] px-4 py-3 text-[9.5px] text-[#707574]">
              <div className="flex flex-wrap gap-3">{[["#1F6878", "Confirmed"], ["#1F6878", "New"], ["#f39b35", "Rescheduled"], ["#E95A35", "Cancelled"], ["#707574", "Completed"]].map(([color, label]) => <span key={label} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</span>)}</div>
              <span>Showing {bookings.length} appointments</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onBlock("full")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1F6878]/20 bg-white px-3.5 text-[11px] font-semibold text-[#1F6878] hover:bg-[#E4F0F2]"><Calendar className="h-3.5 w-3.5 text-[#1F6878]" /> Block date</button>
        <button type="button" onClick={() => onBlock("range")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E95A35] px-3.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#D14824]"><Clock3 className="h-3.5 w-3.5" /> Block time</button>
      </div>
    </section>
  );
}

function AvailabilitySettingsPanel({ compact = false, blockRequest = null, onBlockRequestHandled }: { compact?: boolean; blockRequest?: "full" | "range" | null; onBlockRequestHandled?: () => void }) {
  const [settings, setSettings] = useState<AvailabilitySettings>(defaultAvailability);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<Omit<BlockedDate, "id">>({ date: "", type: "full", start: "09:30", end: "18:30", reason: "Clinic closed", notes: "", dentist: "All dentists" });
  const [dentists, setDentists] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    api.get<Meta>("/api/meta").then((data) => { if (active) setDentists(data.dentists); }).catch(() => {});
    api.get<AvailabilitySettings>("/api/admin/availability-settings")
      .then((data) => { if (active) setSettings({ ...defaultAvailability, ...data }); })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : "Could not load clinic hours."); })
      .finally(() => { if (active) setLoadingSettings(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!blockRequest) return;
    setBlockForm((current) => ({ ...current, type: blockRequest }));
    setBlockOpen(true);
    onBlockRequestHandled?.();
  }, [blockRequest, onBlockRequestHandled]);

  const persist = async (next: AvailabilitySettings, message: string) => {
    if (saving) return false;
    setSaving(true);
    try {
      const saved = await api.patch<AvailabilitySettings>("/api/admin/availability-settings", next);
      setSettings({ ...defaultAvailability, ...saved });
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save clinic availability.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: string, updates: Partial<WorkingDay>) => setSettings((current) => ({
    ...current,
    weeklyHours: current.weeklyHours.map((item) => item.day === day ? { ...item, ...updates } : item),
  }));

  const addBreak = (day: string) => setSettings((current) => ({
    ...current,
    weeklyHours: current.weeklyHours.map((item) => item.day === day ? { ...item, breaks: [...item.breaks, { start: "13:00", end: "14:00" }] } : item),
  }));

  const updateBreak = (day: string, index: number, key: "start" | "end", value: string) => setSettings((current) => ({
    ...current,
    weeklyHours: current.weeklyHours.map((item) => item.day === day ? { ...item, breaks: item.breaks.map((breakTime, breakIndex) => breakIndex === index ? { ...breakTime, [key]: value } : breakTime) } : item),
  }));

  const addBlockedDate = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: AvailabilitySettings = {
      ...settings,
      blockedDates: [...settings.blockedDates, { ...blockForm, id: crypto.randomUUID() }].sort((a, b) => a.date.localeCompare(b.date)),
    };
    if (await persist(next, "Blocked date added")) {
      setBlockOpen(false);
      setBlockForm({ date: "", type: "full", start: "09:30", end: "18:30", reason: "Clinic closed", notes: "", dentist: "All dentists" });
    }
  };

  if (loadingSettings) return <div className="grid min-h-52 place-items-center rounded-2xl border border-[#1F6878]/15 bg-white text-sm text-[#707574]">Loading clinic hours…</div>;

  return (
    <>
      {!compact && <>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,0.85fr)]">
        <section className="rounded-[22px] border border-[#1F6878]/15 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-display text-[20px] font-bold text-[#1F6878]">Weekly working hours</h2><p className="mt-1 text-[12px] text-[#707574]">Clinic schedule · Erode</p></div>
            <span className="rounded-full bg-[#E4F0F2] px-3 py-2 text-[11px] font-semibold text-[#1F6878]">All providers</span>
          </div>
          <div className="divide-y divide-[#1F6878]/10">
            {settings.weeklyHours.map((row) => (
              <div key={row.day} className={`grid gap-x-3 gap-y-2 py-3.5 sm:grid-cols-[72px_100px_minmax(110px,1fr)_20px_minmax(110px,1fr)_auto] sm:items-center ${row.enabled ? "" : "opacity-55"}`}>
                <button type="button" role="switch" aria-checked={row.enabled} aria-label={`${row.enabled ? "Close" : "Open"} ${row.day}`} onClick={() => updateDay(row.day, { enabled: !row.enabled })} className={`relative h-6 w-11 rounded-full transition ${row.enabled ? "bg-[#1F6878]" : "bg-[#707574]/30"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${row.enabled ? "left-6" : "left-1"}`} /></button>
                <span className="text-[12px] font-semibold text-[#1F6878]">{row.day}</span>
                {row.enabled ? <>
                  <Input aria-label={`${row.day} opening time`} type="time" value={row.start} onChange={(event) => updateDay(row.day, { start: event.target.value })} className="h-10 rounded-lg px-2.5 text-[12px]" />
                  <span className="text-center text-[11px] text-[#707574]">to</span>
                  <Input aria-label={`${row.day} closing time`} type="time" value={row.end} onChange={(event) => updateDay(row.day, { end: event.target.value })} className="h-10 rounded-lg px-2.5 text-[12px]" />
                  <button type="button" onClick={() => addBreak(row.day)} className="justify-self-start whitespace-nowrap text-[10.5px] font-semibold text-[#1F6878] hover:text-[#E95A35]">+ Add break</button>
                </> : <span className="sm:col-span-4 sm:text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#707574]">Clinic closed</span>}
                {row.enabled && row.breaks.map((breakTime, index) => <div key={`${row.day}-break-${index}`} className="sm:col-start-3 sm:col-span-4 flex flex-wrap items-center gap-2 pl-0 sm:pl-1">
                  <span className="text-[10px] font-semibold text-[#707574]">Break</span>
                  <Input aria-label={`${row.day} break starts`} type="time" value={breakTime.start} onChange={(event) => updateBreak(row.day, index, "start", event.target.value)} className="h-9 max-w-36 rounded-lg px-2.5 text-[11px]" />
                  <span className="text-[10px] text-[#707574]">to</span>
                  <Input aria-label={`${row.day} break ends`} type="time" value={breakTime.end} onChange={(event) => updateBreak(row.day, index, "end", event.target.value)} className="h-9 max-w-36 rounded-lg px-2.5 text-[11px]" />
                  <button type="button" aria-label={`Remove ${row.day} break`} onClick={() => updateDay(row.day, { breaks: row.breaks.filter((_, breakIndex) => breakIndex !== index) })} className="rounded-lg p-2 text-[#707574] hover:bg-rose-50 hover:text-rose-700"><X className="h-3.5 w-3.5" /></button>
                </div>)}
              </div>
            ))}
          </div>
          <Button className="mt-5 w-full sm:w-auto" loading={saving} onClick={() => void persist(settings, "Working hours saved")}><CheckCircle2 className="h-4 w-4" /> Save working hours</Button>
        </section>

        <div className="space-y-5">
          <section className="rounded-[22px] border border-[#1F6878]/15 bg-white p-5 shadow-soft sm:p-6">
            <h2 className="font-display text-[20px] font-bold text-[#1F6878]">Slot settings</h2>
            <div className="mt-5 space-y-4">
              <Select label="Appointment duration" value={String(settings.appointmentDuration)} onChange={(event) => setSettings((current) => ({ ...current, appointmentDuration: Number(event.target.value) }))} options={[15, 30, 45, 60].map((value) => ({ value: String(value), label: `${value} minutes` }))} />
              <Input label="Maximum patients per slot" type="number" min={1} max={10} value={settings.maxPatientsPerSlot} onChange={(event) => setSettings((current) => ({ ...current, maxPatientsPerSlot: Number(event.target.value) }))} helperText="Limits the number of patients confirmed at the same time." />
            </div>
          </section>

          <section className="rounded-[22px] border border-[#1F6878] bg-[#1F6878] p-5 text-white shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-[20px] font-bold">Blocked dates</h2><p className="mt-1 text-[11.5px] text-white/65">Holidays and planned closures</p></div><span className="grid h-9 w-9 place-items-center rounded-full bg-[#1F6878]/40 text-[#E4F0F2]"><Calendar className="h-4 w-4" /></span></div>
            <ul className="mt-5 space-y-2.5">
              {settings.blockedDates.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-white/[0.08] px-3.5 py-3"><div><p className="text-[12px] font-semibold">{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}{item.type === "range" ? ` · ${item.start}–${item.end}` : ""}</p><p className="mt-0.5 text-[10px] text-white/65">{item.reason}{item.dentist && item.dentist !== "All dentists" ? ` · ${item.dentist}` : ""}{item.notes ? ` · ${item.notes}` : ""}</p></div><button type="button" aria-label={`Remove blocked date ${item.date}`} onClick={() => void persist({ ...settings, blockedDates: settings.blockedDates.filter((entry) => entry.id !== item.id) }, "Blocked date removed")} className="shrink-0 rounded-full p-1.5 text-white/65 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></li>)}
              {!settings.blockedDates.length && <li className="rounded-[14px] border border-dashed border-white/20 px-4 py-5 text-center text-[11px] text-white/65">No dates blocked yet</li>}
            </ul>
            <button type="button" onClick={() => setBlockOpen(true)} className="mt-3 w-full rounded-xl bg-[#E95A35] px-4 py-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#D14824]">＋ Block another date</button>
            <p className="mt-4 text-[10px] text-white/60">Emergency visits can still be arranged by calling the clinic.</p>
          </section>
        </div>
      </div>
      <section className="mt-5 flex items-center gap-4 rounded-[18px] border border-[#1F6878]/15 bg-[#E4F0F2] px-5 py-4 text-[#1F6878]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#1F6878]"><Clock3 className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold">Automatic buffer between appointments</p><p className="mt-1 text-[11px] leading-relaxed text-[#707574]">A 10-minute chair reset is included when patient slots are generated.</p></div>
        <span className="rounded-full bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1F6878]">10 min buffer</span>
      </section>
      </>}

      <Modal isOpen={blockOpen} onClose={() => setBlockOpen(false)} title={blockForm.type === "range" ? "Block time range" : "Block a date"} description={blockForm.type === "range" ? "Prevent appointments during selected hours." : "Prevent appointments on selected dates."} size="md">
        <form onSubmit={addBlockedDate} className="space-y-4">
          <div><p className="mb-2 text-sm font-medium text-[#1F6878]">Block type</p><div className="grid grid-cols-2 rounded-xl bg-[#F5F2EB] p-1 border border-[#1F6878]/15"><button type="button" onClick={() => setBlockForm((current) => ({ ...current, type: "full" }))} className={`rounded-lg px-3 py-2.5 text-[12px] font-semibold ${blockForm.type === "full" ? "bg-[#1F6878] text-white" : "text-[#707574]"}`}>Full day</button><button type="button" onClick={() => setBlockForm((current) => ({ ...current, type: "range" }))} className={`rounded-lg px-3 py-2.5 text-[12px] font-semibold ${blockForm.type === "range" ? "bg-[#1F6878] text-white" : "text-[#707574]"}`}>Time range</button></div></div>
          <Input label="Date" type="date" required value={blockForm.date} onChange={(event) => setBlockForm((current) => ({ ...current, date: event.target.value }))} />
          {blockForm.type === "range" && <div className="grid grid-cols-2 gap-3"><Input label="From" type="time" required value={blockForm.start} onChange={(event) => setBlockForm((current) => ({ ...current, start: event.target.value }))} /><Input label="To" type="time" required value={blockForm.end} onChange={(event) => setBlockForm((current) => ({ ...current, end: event.target.value }))} /></div>}
          {blockForm.type === "range" && <><p className="-mt-2 text-[10px] text-[#707574]">Duration: {Math.max(0, Math.round((new Date(`1970-01-01T${blockForm.end}:00`).getTime() - new Date(`1970-01-01T${blockForm.start}:00`).getTime()) / 60000 / 60 * 10) / 10)} hours · blocked slots will be hidden</p><Select label="Dentist" value={blockForm.dentist ?? "All dentists"} onChange={(event) => setBlockForm((current) => ({ ...current, dentist: event.target.value }))} options={[{ value: "All dentists", label: "All dentists (blocks all operatories)" }, ...dentists.map((name) => ({ value: name, label: name }))]} /></>}
          <Select label="Reason" value={blockForm.reason} onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))} options={["Clinic closed", "Public holiday", "Staff training", "Maintenance", "Other"].map((value) => ({ value, label: value }))} />
          <label className="block text-sm font-medium text-[#1F6878]">Notes (optional)<textarea rows={3} value={blockForm.notes} onChange={(event) => setBlockForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Add a note for your team (optional)" className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-white px-4 py-3 text-sm text-[#1F6878] placeholder:text-[#707574]/70 focus:border-[#1F6878] focus:outline-none focus:ring-4 focus:ring-[#1F6878]/15" /></label>
          <div className="flex justify-end gap-3 border-t border-[#1F6878]/10 pt-4"><Button type="button" variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button><Button type="submit" loading={saving}><Calendar className="h-4 w-4" /> {blockForm.type === "range" ? "Block time" : "Block date"}</Button></div>
        </form>
      </Modal>
    </>
  );
}

const nextStatus = (status: BookingStatus): BookingStatus | null => {
  if (status === "pending") return "confirmed";
  if (status === "confirmed") return "checked_in";
  if (status === "checked_in") return "completed";
  return null;
};

const actionLabel = (status: BookingStatus) => {
  if (status === "pending") return "Confirm";
  if (status === "confirmed") return "Check in";
  if (status === "checked_in") return "Complete";
  return null;
};


const cleanPhoneForWa = (phone: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};



export default function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">(() => searchParams.get("view") === "calendar" ? "calendar" : "list");
  const availabilityPanel = searchParams.get("panel") === "availability";
  const chooseView = (next: "list" | "calendar") => {
    setView(next);
    setSearchParams(next === "calendar" ? { view: "calendar" } : {}, { replace: true });
  };
  useEffect(() => {
    setView(searchParams.get("view") === "calendar" ? "calendar" : "list");
  }, [searchParams]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [aptOpen, setAptOpen] = useState(false);
  const [aptForm, setAptForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ booking: Booking; action: "confirm" | "reject" } | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("Schedule conflict");
  const [rejectMessage, setRejectMessage] = useState("");
  const [calendarBlockRequest, setCalendarBlockRequest] = useState<"full" | "range" | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleDentist, setRescheduleDentist] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const [customWaBooking, setCustomWaBooking] = useState<Booking | null>(null);
  const [customWaMessage, setCustomWaMessage] = useState("");
  const [customWaSending, setCustomWaSending] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleOpenReschedule = (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate(booking.date);
    setRescheduleTime(booking.time);
    setRescheduleDentist(booking.dentist || "Dr. Kishore Kumar");
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) {
      toast.error("Please pick a valid date and time slot.");
      return;
    }
    setRescheduleSaving(true);
    try {
      const data = await api.patch<{ booking: Booking }>(`/api/admin/bookings/${rescheduleBooking.id}`, {
        date: rescheduleDate,
        time: rescheduleTime,
        dentist: rescheduleDentist,
      });
      setBookings((prev) => prev.map((b) => (b.id === rescheduleBooking.id ? data.booking : b)));
      setRescheduleBooking(null);
      toast.success(`✅ Rescheduled! Live WhatsApp notification sent to ${data.booking.patientName} & clinic via Green-API!`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to reschedule appointment.");
    } finally {
      setRescheduleSaving(false);
    }
  };

  const applyTemplate = (type: string, booking: Booking) => {
    const first = booking.patientName.split(" ")[0] || "there";
    switch (type) {
      case "confirmed":
        setCustomWaMessage(
          `✅ APPOINTMENT CONFIRMED!\n\nDear ${first},\nYour appointment at Sri Saraswathi Dental Clinic has been confirmed.\n\n• Token Ref: ${booking.ref}\n• Treatment: ${booking.serviceLabel}\n• Date: ${booking.dateLabel}\n• Time: ${booking.time}\n• Doctor: ${booking.dentist || "Dr. Kishore Kumar"}\n• Address: 866, Soli Complex, Surampatti Four Rd, Erode - 638009\n• Map: https://maps.google.com/?q=Sri+Saraswathi+Dental+Clinic+Erode\n\nFor any questions, contact us at 0424 427 2494 / 9345743409.\nSee you soon!`
        );
        break;
      case "reminder":
        setCustomWaMessage(
          `⏰ APPOINTMENT REMINDER\n\nHi ${first}, this is a gentle reminder for your dental appointment tomorrow (${booking.dateLabel}) at ${booking.time} at Sri Saraswathi Dental Clinic.\n\nPlease arrive 10 minutes early. Contact +919345743409 if you need to reschedule or get directions.`
        );
        break;
      case "rescheduled":
        setCustomWaMessage(
          `🗓️ APPOINTMENT RESCHEDULED\n\nDear ${first}, your appointment at Sri Saraswathi Dental Clinic has been updated:\n\n• New Date: ${booking.dateLabel}\n• New Time: ${booking.time}\n• Doctor: ${booking.dentist || "Dr. Kishore Kumar"}\n\nLocation: 866, Soli Complex, Surampatti Four Rd, Erode.\nReply or call +919345743409 for assistance.`
        );
        break;
      case "pre_op":
        setCustomWaMessage(
          `🦷 PRE-VISIT INSTRUCTIONS\n\nHi ${first}, for your scheduled ${booking.serviceLabel} today at Sri Saraswathi Dental Clinic:\n\n1. Have a light meal at least 1 hour before your visit.\n2. Avoid caffeine, smoking or alcohol.\n3. Take any regular daily BP/sugar medications as advised.\n\nWe look forward to seeing you!`
        );
        break;
      case "post_op":
        setCustomWaMessage(
          `💊 POST-TREATMENT CARE INSTRUCTIONS\n\nDear ${first}, thank you for visiting Sri Saraswathi Dental Clinic today!\n\n• Avoid hot, spicy, or crunchy foods for 24 hours.\n• Take prescribed medications on time after meals.\n• Do not spit or rinse vigorously today.\n• Use cold pack on cheek if mild swelling occurs.\n\nFor emergency assistance, call 0424 427 2494.`
        );
        break;
      case "running_late":
        setCustomWaMessage(
          `⏳ CLINIC UPDATE\n\nHi ${first}, our doctor is running approximately 15 minutes behind schedule today due to an urgent emergency patient.\n\nWe sincerely apologize for this short wait and will attend to you as soon as possible. Thank you for your patience!`
        );
        break;
      case "review":
        setCustomWaMessage(
          `⭐ SHARE YOUR EXPERIENCE\n\nDear ${first}, thank you for choosing Sri Saraswathi Dental Clinic for your dental care! We hope you had a comfortable visit.\n\nCould you please take 30 seconds to share your review on Google? Your feedback helps more families smile:\nhttps://maps.google.com/?q=Sri+Saraswathi+Dental+Clinic+Erode\n\nThank you!`
        );
        break;
      default:
        break;
    }
  };

  const handleOpenCustomWa = (booking: Booking, initialTemplate = "confirmed") => {
    setCustomWaBooking(booking);
    setCopiedText(false);
    applyTemplate(initialTemplate, booking);
  };

  const handleOpenWaWeb = () => {
    if (!customWaBooking) return;
    const phone = cleanPhoneForWa(customWaBooking.patientPhone);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(customWaMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp Web / App...");
  };

  

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(customWaMessage);
      setCopiedText(true);
      toast.success("Message copied to clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Failed to copy message.");
    }
  };

  const handleSendCustomWa = async () => {
    if (!customWaBooking || !customWaMessage.trim()) {
      toast.error("Message cannot be empty.");
      return;
    }
    setCustomWaSending(true);
    try {
      await api.post(`/api/admin/bookings/${customWaBooking.id}/whatsapp`, {
        message: customWaMessage.trim(),
      });
      toast.success(`✅ Live WhatsApp message delivered to ${customWaBooking.patientName} via Green-API!`);
      setCustomWaBooking(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to send WhatsApp message.");
    } finally {
      setCustomWaSending(false);
    }
  };

  const handleSendReminder = (booking: Booking) => {
    const first = booking.patientName.split(" ")[0] || "there";
    const text = `⏰ APPOINTMENT REMINDER\n\nHi ${first}, this is a gentle reminder for your dental appointment tomorrow (${booking.dateLabel}) at ${booking.time} at Sri Saraswathi Dental Clinic.\n\nPlease arrive 10 minutes prior to your slot. For any directions or changes, please reply here or call +919345743409.\nSee you soon!`;
    const phone = cleanPhoneForWa(booking.patientPhone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    toast.success(`Opening WhatsApp Web with reminder for ${booking.patientName}...`);
  };

  const clearCalendarBlockRequest = useCallback(() => setCalendarBlockRequest(null), []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await api.get<{ bookings: Booking[] }>("/api/admin/bookings");
      setBookings(data.bookings);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    api
      .get<Meta>("/api/meta")
      .then(setMeta)
      .catch(() => {});
  }, [load]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: bookings.length };
    bookings.forEach((b) => {
      base[b.status] = (base[b.status] ?? 0) + 1;
    });
    return base;
  }, [bookings]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bookings;
    return bookings.filter(
      (b) =>
        b.patientName.toLowerCase().includes(term) ||
        b.ref.toLowerCase().includes(term) ||
        b.patientPhone.toLowerCase().includes(term) ||
        b.serviceLabel.toLowerCase().includes(term) ||
        b.dentist.toLowerCase().includes(term),
    );
  }, [bookings, search]);

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    setBusyId(booking.id);
    try {
      const data = await api.patch<{ booking: Booking }>(`/api/admin/bookings/${booking.id}`, { status });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? data.booking : b)));
      toast.success(`${booking.patientName} · ${data.booking.statusLabel}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update the appointment.");
    } finally {
      setBusyId(null);
    }
  };

  const completeRequestDecision = async () => {
    if (!statusDialog) return;
    const { booking, action } = statusDialog;
    const whatsappTab = window.open("about:blank", "_blank");
    if (whatsappTab) whatsappTab.opener = null;
    setBusyId(booking.id);
    try {
      const status: BookingStatus = action === "confirm" ? "confirmed" : "cancelled";
      const decisionNote = action === "reject"
        ? [booking.notes, `Request rejected: ${rejectReason}${rejectMessage.trim() ? ` — ${rejectMessage.trim()}` : ""}`].filter(Boolean).join("\n")
        : booking.notes;
      const data = await api.patch<{ booking: Booking }>(`/api/admin/bookings/${booking.id}`, { status, notes: decisionNote });
      setBookings((previous) => previous.map((item) => item.id === booking.id ? data.booking : item));
      setStatusDialog(null);
      setRejectMessage("");
      toast.success(action === "confirm" ? "Appointment confirmed — automated patient WhatsApp sent!" : "Appointment rejected — automated patient WhatsApp sent!");
      const patientFirstName = data.booking.patientName.split(" ")[0] || "there";
      const patientDigits = data.booking.patientPhone.replace(/\D/g, "");
      const whatsappNumber = patientDigits.length === 10 ? `91${patientDigits}` : patientDigits;
      const rejectionText = [
        `Hi ${patientFirstName}, we could not confirm your ${data.booking.serviceLabel} appointment request for ${data.booking.dateLabel} at ${data.booking.time}.`,
        `Reason: ${rejectReason}.`,
        rejectMessage.trim(),
        "Please contact Sri Saraswathi Dental Clinic so we can help find another time.",
      ].filter(Boolean).join("\n");
      const messageLink = action === "reject" && whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(rejectionText)}`
        : data.booking.whatsapp?.patient;
      if (messageLink && whatsappTab) whatsappTab.location.href = messageLink;
      else whatsappTab?.close();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update the appointment.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!aptForm.patientName.trim() || !aptForm.date) {
      toast.error("Patient name and date are required.");
      return;
    }
    if (aptForm.patientPhone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid patient phone number.");
      return;
    }
    setCreating(true);
    try {
      const data = await api.post<{ booking: Booking }>("/api/admin/bookings", aptForm);
      setBookings((prev) => [data.booking, ...prev]);
      toast.success(`Appointment ${data.booking.ref} created for ${data.booking.patientName}`);
      setAptForm(emptyForm);
      setAptOpen(false);
      chooseView("list");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create the appointment.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">Appointments</span>
          <h1 className="mt-2 text-display-3 text-[#1F6878]">{view === "calendar" ? (availabilityPanel ? "Availability & Schedule" : "Appointment Calendar") : "Appointment requests"}</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
      
      {/* Reschedule Modal */}
      <Modal
        isOpen={Boolean(rescheduleBooking)}
        onClose={() => setRescheduleBooking(null)}
        size="md"
        title="Reschedule Appointment"
        description={rescheduleBooking ? `Modify date or time for ${rescheduleBooking.patientName} (${rescheduleBooking.ref})` : ""}
      >
        {rescheduleBooking && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-[#E4F0F2] border border-[#1F6878]/20 px-3 py-2 text-xs text-[#1F6878]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-[#1F6878] animate-pulse" />
                Connected via <strong>Green-API (Live WhatsApp Gateway)</strong>
              </span>
              <span className="text-[11px] text-[#1F6878]">
                Direct to patient mobile
              </span>
            </div>

            <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3 text-xs text-[#1F6878] flex items-start gap-2.5">
              <CalendarClock className="h-4 w-4 shrink-0 text-[#1F6878] mt-0.5" />
              <div>
                <p className="font-semibold text-[#1F6878]">Instant Patient WhatsApp Notice</p>
                <p className="mt-0.5 text-[#707574]">
                  When you click Reschedule, an automatic WhatsApp notification with the new date, time, and clinic map will be sent directly to <strong>{rescheduleBooking.patientPhone}</strong> and an alert to clinic WhatsApp.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#1F6878] mb-1">New Appointment Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#1F6878]/20 bg-white px-3.5 py-2.5 text-sm text-[#1F6878] focus:border-[#1F6878] focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="New Time Slot"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  options={[
                    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                    "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM",
                    "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"
                  ].map((s) => ({ value: s, label: s }))}
                />
              </div>
            </div>

            <div>
              <Select
                label="Assign Doctor"
                value={rescheduleDentist}
                onChange={(e) => setRescheduleDentist(e.target.value)}
                options={[
                  { value: "Dr. Kishore Kumar", label: "Dr. Kishore Kumar (Chief Dental Surgeon)" },
                  { value: "Dr. Aarthi Kishore", label: "Dr. Aarthi Kishore (Orthodontist & Aesthetic Dentist)" },
                  { value: "First available dentist", label: "First Available Specialist" },
                ]}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#1F6878]/10 pt-3">
              <Button type="button" variant="outline" onClick={() => setRescheduleBooking(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                loading={rescheduleSaving}
                onClick={() => void handleConfirmReschedule()}
              >
                <CalendarClock className="h-4 w-4" /> Reschedule &amp; Send WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 100% Free WhatsApp Web Messenger */}
      <Modal
        isOpen={Boolean(customWaBooking)}
        onClose={() => setCustomWaBooking(null)}
        size="lg"
        title="WhatsApp Web Messenger (100% Free · Direct Chat)"
        description={customWaBooking ? `${customWaBooking.patientName} · ${customWaBooking.patientPhone} · ${customWaBooking.serviceLabel}` : ""}
      >
        {customWaBooking && (
          <div className="space-y-4">
            {/* Free Status Banner */}
            <div className="flex items-center justify-between rounded-xl bg-[#E4F0F2] border border-[#19B987]/35 px-3.5 py-2.5 text-xs text-[#15191B]">
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#19B987] animate-pulse" />
                <span><strong>100% Free WhatsApp Web</strong> · Sends directly from Clinic WhatsApp (<strong>9345743409</strong>)</span>
              </span>
              <span className="rounded-full bg-[#19B987]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#139A70]">
                Zero Fees
              </span>
            </div>

            {/* Quick Templates Picker */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Click template to load message:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "confirmed", label: "✅ Confirmed" },
                  { id: "reminder", label: "⏰ 24h Reminder" },
                  { id: "rescheduled", label: "🗓️ Rescheduled" },
                  { id: "pre_op", label: "🦷 Pre-Op Care" },
                  { id: "post_op", label: "💊 Post-Op Care" },
                  { id: "running_late", label: "⏳ Delay Notice" },
                  { id: "review", label: "⭐ Google Review" },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl.id, customWaBooking)}
                    className="rounded-full border border-[#1F6878]/20 bg-[#F5F2EB] px-3 py-1 text-[11px] font-medium text-[#1F6878] hover:bg-[#E4F0F2] hover:text-[#1F6878] hover:border-[#1F6878] transition"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Message Box */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#1F6878]">Message Preview &amp; Editor</label>
                <button
                  type="button"
                  onClick={() => void handleCopyText()}
                  className="inline-flex items-center gap-1 text-[11px] text-[#707574] hover:text-[#1F6878] transition"
                >
                  {copiedText ? <Check className="h-3 w-3 text-[#1F6878]" /> : <Copy className="h-3 w-3" />}
                  {copiedText ? "Copied to clipboard!" : "Copy text"}
                </button>
              </div>
              <textarea
                rows={7}
                className="w-full text-xs rounded-xl border border-[#1F6878]/20 bg-white p-3 font-sans leading-relaxed text-[#1F6878] focus:border-[#1F6878] focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                value={customWaMessage}
                onChange={(e) => setCustomWaMessage(e.target.value)}
                placeholder="Type your WhatsApp message to the patient here..."
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-[#707574]">
                <span>Sending to: <strong>{customWaBooking.patientPhone}</strong></span>
                <span>{customWaMessage.length} characters</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1F6878]/10 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setCustomWaBooking(null)}>
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyText()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1F6878] transition hover:bg-[#E4F0F2]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Text
                </button>

                <button
                  type="button"
                  onClick={handleOpenWaWeb}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#19B987] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(25,185,135,0.45)] transition hover:bg-[#139A70]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send via WhatsApp Web
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {view === "calendar" ? (availabilityPanel ? "Set working hours, appointment duration and clinic capacity." : "View clinic bookings by day, week or month.") : "Review bookings, confirm time slots and keep patients informed."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} aria-label="Refresh appointments">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <div className="flex rounded-full border border-[#1F6878]/20 bg-white p-1">
            <button
              onClick={() => chooseView("list")}
              aria-label="List view"
              className={`rounded-full p-1.5 ${view === "list" ? "bg-[#1F6878] text-white" : "text-[#707574] hover:text-[#1F6878]"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => chooseView("calendar")}
              aria-label="Agenda view"
              className={`rounded-full p-1.5 ${view === "calendar" ? "bg-[#1F6878] text-white" : "text-[#707574] hover:text-[#1F6878]"}`}
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => setAptOpen(true)}>
            <Plus className="h-4 w-4" /> New appointment
          </Button>
        </div>
      </div>

      <Modal
        isOpen={aptOpen}
        onClose={() => setAptOpen(false)}
        title="New appointment"
        description="Book a walk-in or phone booking. It appears in the patient's portal too."
      >
        <div className="space-y-4">
          <Input
            label="Patient name"
            required
            value={aptForm.patientName}
            onChange={(e) => setAptForm({ ...aptForm, patientName: e.target.value })}
            placeholder="Full name"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone (WhatsApp)"
              type="tel"
              required
              value={aptForm.patientPhone}
              onChange={(e) => setAptForm({ ...aptForm, patientPhone: e.target.value })}
              placeholder="98765 43210"
            />
            <Input
              label="Email"
              type="email"
              value={aptForm.patientEmail}
              onChange={(e) => setAptForm({ ...aptForm, patientEmail: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <Select
            label="Service"
            required
            value={aptForm.service}
            onChange={(e) => setAptForm({ ...aptForm, service: e.target.value })}
            options={meta?.services ?? [{ value: "general-dentistry", label: "General Check-up & Cleaning" }]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              required
              value={aptForm.date}
              onChange={(e) => setAptForm({ ...aptForm, date: e.target.value })}
            />
            <Select
              label="Time"
              required
              value={aptForm.time}
              onChange={(e) => setAptForm({ ...aptForm, time: e.target.value })}
              options={(meta?.slots ?? ["9:00 AM"]).map((time) => ({ value: time, label: time }))}
            />
          </div>
          <Select
            label="Dentist"
            placeholder="First available"
            value={aptForm.dentist}
            onChange={(e) => setAptForm({ ...aptForm, dentist: e.target.value })}
            options={(meta?.dentists ?? []).map((name) => ({ value: name, label: name }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} loading={creating}>
              <UserCheck className="h-4 w-4" /> Create appointment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(statusDialog)}
        onClose={() => !busyId && setStatusDialog(null)}
        size="md"
        title={statusDialog?.action === "reject" ? "Reject appointment request?" : "Confirm appointment?"}
        description={statusDialog?.action === "reject"
          ? "The request will be marked as cancelled. A prepared WhatsApp message will open for you to review and send."
          : "The appointment will be confirmed. A prepared WhatsApp message will open for you to review and send."}
      >
        {statusDialog && <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${statusDialog.action === "reject" ? "border-rose-100 bg-rose-50/50" : "border-[#1F6878]/20 bg-[#E4F0F2]/70"}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${statusDialog.action === "reject" ? "bg-rose-100 text-rose-700" : "bg-[#E4F0F2] text-[#1F6878]"}`}>
                {statusDialog.action === "reject" ? <CircleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1F6878]">{statusDialog.booking.patientName}</p>
                <p className="mt-1 text-xs text-[#707574]">{statusDialog.booking.serviceLabel}</p>
                <p className="mt-2 text-xs font-medium text-[#1F6878]">{statusDialog.booking.dateLabel} · {statusDialog.booking.time}</p>
                <p className="mt-1 text-xs text-[#707574]">{statusDialog.booking.dentist || "First available dentist"} · Ref {statusDialog.booking.ref}</p>
              </div>
            </div>
          </div>
          {statusDialog.action === "reject" && <div className="space-y-3">
            <Select label="Reason for rejection" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} options={["Schedule conflict", "Dentist unavailable", "Clinic closed", "Requested slot unavailable", "Other"] .map((value) => ({ value, label: value }))} />
            <label className="block text-xs font-semibold text-[#1F6878]">Message for the patient (optional)
              <textarea rows={3} value={rejectMessage} onChange={(event) => setRejectMessage(event.target.value)} placeholder="Add a short note to include in the prepared message" className="mt-1.5 w-full resize-y rounded-xl border border-[#1F6878]/20 bg-white px-3.5 py-3 text-sm font-normal text-[#1F6878] outline-none transition placeholder:text-[#707574]/70 focus:border-[#1F6878] focus:ring-4 focus:ring-[#1F6878]/15" />
            </label>
          </div>}
          <div className="flex flex-col-reverse gap-2 border-t border-[#1F6878]/10 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setStatusDialog(null)} disabled={busyId === statusDialog.booking.id}>Cancel</Button>
            <Button type="button" loading={busyId === statusDialog.booking.id} onClick={() => void completeRequestDecision()} className={statusDialog.action === "reject" ? "bg-rose-700 hover:bg-rose-800" : ""}>
              {statusDialog.action === "reject" ? <><X className="h-4 w-4" /> Reject & open WhatsApp</> : <><CheckCircle2 className="h-4 w-4" /> Confirm & open WhatsApp</>}
            </Button>
          </div>
        </div>}
      </Modal>

      <Modal isOpen={Boolean(detailsBooking)} onClose={() => setDetailsBooking(null)} size="md" title="Appointment details" description={detailsBooking ? `Request ${detailsBooking.ref}` : undefined}>
        {detailsBooking && <div className="space-y-5">
          <div className="rounded-2xl border border-[#1F6878]/15 bg-[#F5F2EB] p-4">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#E4F0F2] text-sm font-semibold text-[#1F6878]">{detailsBooking.patientName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><p className="text-sm font-semibold text-[#1F6878]">{detailsBooking.patientName}</p><p className="mt-0.5 text-xs text-[#707574]">Patient</p></div><Badge className="ml-auto" variant={statusTone[detailsBooking.status]} size="sm">{detailsBooking.statusLabel}</Badge></div>
            <div className="mt-4 grid gap-2 border-t border-[#1F6878]/10 pt-3 text-xs text-[#1F6878]/80">
              <a className="inline-flex items-center gap-2 hover:text-[#1F6878]" href={`tel:${detailsBooking.patientPhone}`}><Phone className="h-3.5 w-3.5 text-[#1F6878]" />{detailsBooking.patientPhone}</a>
              {detailsBooking.patientEmail && <a className="inline-flex items-center gap-2 hover:text-[#1F6878]" href={`mailto:${detailsBooking.patientEmail}`}><Mail className="h-3.5 w-3.5 text-[#1F6878]" />{detailsBooking.patientEmail}</a>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[["Treatment", detailsBooking.serviceLabel], ["Date", detailsBooking.dateLabel], ["Time", detailsBooking.time], ["Dentist", detailsBooking.dentist || "First available"]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#1F6878]/15 bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#707574]">{label}</dt><dd className="mt-1.5 font-medium text-[#1F6878]">{value}</dd></div>)}
          </dl>
          <div className="rounded-xl border border-[#1F6878]/15 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#707574]">Patient notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#1F6878]">{detailsBooking.notes || "No notes provided."}</p></div>
          {detailsBooking.whatsapp?.patient && <a href={detailsBooking.whatsapp.patient} target="_blank" rel="noreferrer" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#19B987] text-xs font-semibold text-white hover:bg-[#139A70] transition"><MessageCircle className="h-4 w-4" /> Open WhatsApp message</a>}
        </div>}
      </Modal>

      {view === "calendar" ? (
        availabilityPanel ? <AvailabilitySettingsPanel /> : <div className="space-y-4"><AppointmentCalendar bookings={visible} onBlock={setCalendarBlockRequest} /><AvailabilitySettingsPanel compact blockRequest={calendarBlockRequest} onBlockRequestHandled={clearCalendarBlockRequest} /></div>
      ) : (
        <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ref, phone, service…"
            className="h-10 w-full rounded-full border border-[#1F6878]/20 bg-white pl-10 pr-4 text-[13px] text-[#1F6878] placeholder:text-[#707574]/70 focus:border-[#1F6878] focus:outline-none focus:ring-4 focus:ring-[#1F6878]/15"
          />
        </div>
        <span className="text-[12px] text-[#707574]">
          {loading ? "Loading…" : `${visible.length} bookings`}
        </span>
      </div>

      <Tabs
        tabs={[
          { id: "all", label: `All (${counts.all ?? 0})` },
          { id: "pending", label: `Pending (${counts.pending ?? 0})` },
          { id: "confirmed", label: `Confirmed (${counts.confirmed ?? 0})` },
          { id: "checked_in", label: `Checked in (${counts.checked_in ?? 0})` },
          { id: "completed", label: `Completed (${counts.completed ?? 0})` },
          { id: "cancelled", label: `Cancelled (${counts.cancelled ?? 0})` },
        ]}
      >
        {(activeTab) => {
          const rows = activeTab === "all" ? visible : visible.filter((b) => b.status === activeTab);

          if (loading) {
            return (
              <div className="flex items-center gap-3 rounded-2xl border border-[#1F6878]/15 bg-white px-5 py-10 text-[13px] text-[#707574] shadow-soft">
                <Loader2 className="h-4 w-4 animate-spin text-[#1F6878]" /> Loading appointments…
              </div>
            );
          }

          return (
            <div className="overflow-x-auto rounded-2xl border border-[#1F6878]/15 bg-white shadow-soft">
              <table className="w-full min-w-[1120px]">
                <thead>
                  <tr className="border-b border-[#1F6878]/15 bg-[#F5F2EB]">
                    {["Booking ID", "Patient", "Phone / WhatsApp", "Treatment", "Date & time", "Dentist", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-[#707574]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((apt) => {
                    const next = nextStatus(apt.status);
                    const label = actionLabel(apt.status);
                    const canCancel = apt.status === "confirmed";
                    return (
                      <tr key={apt.id} className="border-b border-[#1F6878]/10 transition-colors hover:bg-[#F5F2EB]/80">
                        <td className="px-4 py-3"><span className="text-[11px] font-semibold text-[#707574]">{apt.ref}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4F0F2] text-[11px] font-semibold text-[#1F6878]">
                              {apt.patientName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#1F6878]">{apt.patientName}</p>
                              <p className="text-[11px] text-[#707574]">Patient</p>
                              {apt.notes && (
                                <p className="mt-0.5 max-w-[220px] truncate text-[11px] italic text-[#707574]/80">
                                  “{apt.notes}”
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#1F6878]">
  <div className="flex items-center gap-2">
    <a href={`tel:${apt.patientPhone}`} className="font-medium text-[#1F6878] hover:text-[#1F6878] hover:underline" title="Call patient">
      {apt.patientPhone}
    </a>
    <button
      type="button"
      onClick={() => handleOpenCustomWa(apt, "confirmed")}
      aria-label={`WhatsApp ${apt.patientName}`}
      title="Open WhatsApp Web (100% Free)"
      className="inline-flex items-center gap-1 rounded-full bg-[#19B987] px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-[#139A70] transition shadow-xs"
    >
      <MessageCircle className="h-3 w-3" />
      <span>WhatsApp</span>
    </button>
  </div>
</td>
                        <td className="px-4 py-3 text-[12px] text-[#1F6878]/85">{apt.serviceLabel}</td>
                        <td className="px-4 py-3 text-sm text-[#1F6878]/85">
                          {apt.dateLabel}
                          <span className="mt-0.5 block text-[11px] text-[#707574]">{apt.time}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#1F6878]/85">{apt.dentist || "First available"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusTone[apt.status]} size="sm">
                            {apt.statusLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {apt.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setStatusDialog({ booking: apt, action: "confirm" })}
                                  disabled={busyId === apt.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-[#1F6878]/25 bg-[#E4F0F2] px-3 py-1 text-[11.5px] font-semibold text-[#1F6878] transition hover:bg-[#1F6878] hover:text-white disabled:opacity-50"
                                ><CheckCircle2 className="h-3.5 w-3.5" />Confirm</button>
                                <button
                                  type="button"
                                  onClick={() => { setRejectReason("Schedule conflict"); setRejectMessage(""); setStatusDialog({ booking: apt, action: "reject" }); }}
                                  disabled={busyId === apt.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-[11.5px] font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                                ><X className="h-3.5 w-3.5" />Reject</button>
                              </>
                            )}
                            {next && label && apt.status !== "pending" && (
                              <button
                                onClick={() => void updateStatus(apt, next)}
                                disabled={busyId === apt.id}
                                className="inline-flex items-center gap-1 rounded-full border border-[#1F6878]/25 px-3 py-1 text-[11.5px] font-medium text-[#1F6878] transition-colors hover:border-[#1F6878] hover:bg-[#E4F0F2] disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            )}
                            {canCancel && (
                              <button
                                onClick={() => void updateStatus(apt, "cancelled")}
                                disabled={busyId === apt.id}
                                aria-label={`Cancel booking for ${apt.patientName}`}
                                className="rounded-full border border-[#1F6878]/20 p-1.5 text-[#707574] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => handleOpenReschedule(apt)}
                              aria-label={`Reschedule appointment for ${apt.patientName}`}
                              title="Reschedule & Send WhatsApp"
                              className="rounded-full border border-[#1F6878]/20 p-1.5 text-[#707574] transition-colors hover:bg-[#E4F0F2] hover:text-[#1F6878]"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenCustomWa(apt)}
                              aria-label={`Send WhatsApp message to ${apt.patientName}`}
                              title="Send WhatsApp Message"
                              className="rounded-full border border-[#19B987]/35 p-1.5 text-[#19B987] transition-colors hover:bg-[#19B987] hover:text-white"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSendReminder(apt)}
                              disabled={busyId === apt.id}
                              aria-label={`Send 24h reminder to ${apt.patientName}`}
                              title="Send 24h WhatsApp Reminder"
                              className="rounded-full border border-[#19B987]/35 p-1.5 text-[#19B987] transition-colors hover:bg-[#19B987] hover:text-white disabled:opacity-50"
                            >
                              <BellRing className="h-3.5 w-3.5" />
                            </button>
<button type="button" onClick={() => setDetailsBooking(apt)} aria-label={`View appointment for ${apt.patientName}`} title="View details" className="rounded-full border border-[#1F6878]/20 p-1.5 text-[#707574] transition-colors hover:bg-[#E4F0F2] hover:text-[#1F6878]"><Eye className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center">
                        <p className="text-sm font-medium text-foreground">No appointments found</p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          Confirm a booking from a patient or create a walk-in appointment.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        }}
      </Tabs>
        </>
      )}
    </DashboardLayout>
  );
}
