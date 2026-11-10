import { useCallback, useEffect, useState } from "react";
import { CalendarDays, LoaderCircle, Mail, MessageSquareText, Phone, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

type Enquiry = { id: number; name: string; phone: string; email: string; message: string; status: "new" | "in_progress" | "resolved"; createdAt: string };

export default function ContactEnquiriesPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await api.get<{ items: Enquiry[] }>("/api/admin/contact-enquiries"); setItems(data.items || []); }
    catch (cause) { setItems([]); setError(cause instanceof Error ? cause.message : "Could not load contact enquiries."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const setStatus = async (item: Enquiry, status: Enquiry["status"]) => {
    try { await api.patch(`/api/admin/contact-enquiries/${item.id}`, { status }); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry)); toast.success("Enquiry status updated"); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not update this enquiry."); }
  };
  const remove = async (item: Enquiry) => {
    if (!window.confirm(`Delete the enquiry from ${item.name}?`)) return;
    try { await api.delete(`/api/admin/contact-enquiries/${item.id}`); setItems((current) => current.filter((entry) => entry.id !== item.id)); toast.success("Enquiry deleted"); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not delete this enquiry."); }
  };

  return <DashboardLayout>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c72d70]">Clinic inbox</p><h1 className="mt-2 text-display-3 text-foreground">Contact enquiries</h1><p className="mt-2 max-w-xl text-[13px] leading-6 text-muted-foreground">Messages submitted through the public contact form. Patient contact details are visible to signed-in administrators only.</p></div><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {loading ? <div className="grid min-h-56 place-items-center rounded-2xl border border-border/70 bg-card"><LoaderCircle className="h-5 w-5 animate-spin text-primary-700" /></div> : items.length ? <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-[20px] border border-border/70 bg-card p-5 shadow-soft sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-semibold text-[#173d43]">{item.name}</h2><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${item.status === "new" ? "bg-[#fff2d9] text-[#91610b]" : item.status === "in_progress" ? "bg-[#e8f2f8] text-[#346a89]" : "bg-[#e8f6ef] text-[#24764f]"}`}>{item.status.replace("_", " ")}</span></div><p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>{item.phone && <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#c72d70]"><Phone className="h-3.5 w-3.5" />{item.phone}</a>}{item.email && <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 hover:text-[#c72d70]"><Mail className="h-3.5 w-3.5" />{item.email}</a>}</p></div><button type="button" onClick={() => void remove(item)} aria-label={`Delete enquiry from ${item.name}`} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button></div><p className="mt-5 whitespace-pre-wrap rounded-xl bg-[#f7f8f5] p-4 text-[13px] leading-6 text-[#53636a]">{item.message}</p><div className="mt-4 flex flex-wrap items-center gap-2"><a href={item.email ? `mailto:${item.email}?subject=${encodeURIComponent("Sri Saraswathi Dental Clinic enquiry")}` : item.phone ? `tel:${item.phone}` : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#073b43] px-4 text-[10px] font-bold text-white"><MessageSquareText className="h-3.5 w-3.5" /> Reply</a><label className="ml-auto flex items-center gap-2 text-[10px] font-semibold text-[#64717a]">Status<select value={item.status} onChange={(event) => void setStatus(item, event.target.value as Enquiry["status"])} className="h-9 rounded-lg border border-border bg-white px-2 text-[11px] text-foreground"><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-primary-700" /><h2 className="mt-4 font-display text-xl font-semibold text-foreground">No contact enquiries yet</h2><p className="mt-2 text-sm text-muted-foreground">Messages from the contact page will appear in this inbox.</p></div>}
  </DashboardLayout>;
}
