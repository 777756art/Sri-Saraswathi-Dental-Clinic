import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import {
  Calendar,
  CalendarCheck,
  Loader2,
  LogIn,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { api, ApiError, type PatientAccount } from "@/lib/api";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : null);
const fmtStamp = (iso: string | null) =>
  iso ? `${dateFmt.format(new Date(iso))} · ${timeFmt.format(new Date(iso))}` : null;

const relative = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PatientAccount | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.get<{ patients: PatientAccount[] }>("/api/admin/patients");
      setPatients(data.patients);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not load patient accounts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      total: patients.length,
      signedIn: patients.filter((p) => p.lastLoginAt).length,
      newThisWeek: patients.filter((p) => new Date(p.joinedAt).getTime() >= weekAgo).length,
      appointments: patients.reduce((sum, p) => sum + p.visits, 0),
    };
  }, [patients]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.phone.toLowerCase().includes(term),
    );
  }, [patients, search]);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
          <h1 className="mt-3 text-display-3 text-foreground">Patient accounts</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Every account created on the website, with sign-in activity and appointment history.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={refreshing || loading}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total accounts", value: stats.total, icon: UserRound, tone: "text-primary-700 bg-primary-50" },
          { label: "Have signed in", value: stats.signedIn, icon: LogIn, tone: "text-emerald-700 bg-emerald-50" },
          { label: "New this week", value: stats.newThisWeek, icon: ShieldCheck, tone: "text-violet-700 bg-violet-50" },
          { label: "Appointments booked", value: stats.appointments, icon: CalendarCheck, tone: "text-amber-700 bg-amber-50" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xl font-semibold leading-none text-foreground">{card.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patient accounts"
            className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-10 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-border/70 bg-secondary-50/50">
              {["Account", "Contact", "Registered", "Last sign-in", "Appointments", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-border/60 last:border-0">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-8 animate-pulse rounded-lg bg-secondary-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700">
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{p.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Badge variant={p.role === "admin" ? "purple" : "info"}>{p.role === "admin" ? "Admin" : "Patient"}</Badge>
                          <span className="text-[10.5px] text-muted-foreground">#{p.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="flex items-center gap-1 text-foreground/75"><Mail className="h-3 w-3" />{p.email}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{p.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/75">
                    <span className="block">{fmtDate(p.joinedAt)}</span>
                    <span className="text-[11px] text-muted-foreground">{relative(p.joinedAt)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {p.lastLoginAt ? (
                      <>
                        <span className="block text-foreground/75">{fmtDate(p.lastLoginAt)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {relative(p.lastLoginAt)} · {p.loginCount} sign-in{p.loginCount === 1 ? "" : "s"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11.5px] text-muted-foreground">No sign-in recorded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/75">
                    <span className="block">{p.visits} booking{p.visits === 1 ? "" : "s"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {p.lastVisit ? `Last visit ${p.lastVisit}` : "No past visit"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(p)}
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-foreground/75 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {patients.length === 0
                    ? "No patient accounts yet. Patients appear here as soon as they register on the website."
                    : `No accounts match “${search}”.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Account"}
        description="Full account details and activity."
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl bg-secondary-50/70 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                {initials(selected.name)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{selected.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {selected.role === "admin" ? "Clinic administrator" : "Patient account"} · #{selected.id}
                </p>
              </div>
              <Badge variant={selected.lastLoginAt ? "success" : "default"} className="ml-auto">
                {selected.lastLoginAt ? "Active" : "No sign-in recorded"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</p>
                <p className="mt-1 flex items-center gap-1.5 break-all text-[13px] text-foreground/80">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{selected.email}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Phone</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/80">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{selected.phone}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Account created</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/80">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {fmtStamp(selected.joinedAt) ?? "—"}
                </p>
                <p className="mt-0.5 pl-5 text-[11px] text-muted-foreground">{relative(selected.joinedAt)}</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last sign-in</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/80">
                  <LogIn className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {fmtStamp(selected.lastLoginAt) ?? "No sign-in recorded yet"}
                </p>
                <p className="mt-0.5 pl-5 text-[11px] text-muted-foreground">
                  {selected.loginCount} successful sign-in{selected.loginCount === 1 ? "" : "s"} in total
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Appointments</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/80">
                  <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {selected.visits} booking{selected.visits === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 pl-5 text-[11px] text-muted-foreground">
                  {selected.lastVisit ? `Last visit ${selected.lastVisit}` : "No past visit yet"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Access level</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/80">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {selected.role === "admin" ? "Clinic administrator" : "Patient portal"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
