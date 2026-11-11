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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#1F6878]">Clinic inbox</p><h1 className="mt-2 font-display text-2xl font-bold text-[#1F6878] sm:text-3xl">Contact enquiries</h1><p className="mt-2 max-w-xl text-[13px] leading-6 text-[#707574]">Messages submitted through the public contact form. Patient contact details are visible to signed-in administrators only.</p></div><Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {loading ? <div className="grid min-h-56 place-items-center rounded-2xl border border-[#1F6878]/15 bg-white"><LoaderCircle className="h-5 w-5 animate-spin text-[#1F6878]" /></div> : items.length ? <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-[20px] border border-[#1F6878]/15 bg-white p-5 shadow-soft sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold text-[#1F6878]">{item.name}</h2><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${item.status === "new" ? "bg-[#E4F0F2] text-[#E95A35]" : item.status === "in_progress" ? "bg-[#E4F0F2] text-[#1F6878]" : "bg-[#E4F0F2] text-[#1F6878]"}`}>{item.status.replace("_", " ")}</span></div><p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#707574]"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-[#1F6878]" />{new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>{item.phone && <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#1F6878]"><Phone className="h-3.5 w-3.5 text-[#1F6878]" />{item.phone}</a>}{item.email && <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 hover:text-[#1F6878]"><Mail className="h-3.5 w-3.5 text-[#1F6878]" />{item.email}</a>}</p></div><button type="button" onClick={() => void remove(item)} aria-label={`Delete enquiry from ${item.name}`} className="grid h-9 w-9 place-items-center rounded-full text-[#707574] transition hover:bg-[#E4F0F2] hover:text-[#E95A35]"><Trash2 className="h-4 w-4" /></button></div><p className="mt-5 whitespace-pre-wrap rounded-xl bg-[#F5F2EB] p-4 text-[13px] leading-6 text-[#1F6878]/85">{item.message}</p><div className="mt-4 flex flex-wrap items-center gap-2"><a href={item.email ? `mailto:${item.email}?subject=${encodeURIComponent("Sri Saraswathi Dental Clinic enquiry")}` : item.phone ? `tel:${item.phone}` : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#E95A35] px-4 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#D14824]"><MessageSquareText className="h-3.5 w-3.5" /> Reply</a><label className="ml-auto flex items-center gap-2 text-[10px] font-semibold text-[#707574]">Status<select value={item.status} onChange={(event) => void setStatus(item, event.target.value as Enquiry["status"])} className="h-9 rounded-lg border border-[#1F6878]/20 bg-white px-2 text-[11px] text-[#1F6878] focus:border-[#1F6878] focus:outline-none"><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-[#1F6878]/25 bg-white px-6 py-14 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-[#1F6878]" /><h2 className="mt-4 font-display text-xl font-bold text-[#1F6878]">No contact enquiries yet</h2><p className="mt-2 text-sm text-[#707574]">Messages from the contact page will appear in this inbox.</p></div>}
  </DashboardLayout>;
}
