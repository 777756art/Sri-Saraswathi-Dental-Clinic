import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { StatsCard } from "@/components/ui/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { DollarSign, TrendingUp, CreditCard, FileText, Download, Plus, Search } from "lucide-react";

const initialInvoices = [
  { id: "INV-2026-001", patient: "Jessica Martinez", date: "Jul 12, 2026", amount: 8500, paid: 8500, status: "Paid", method: "Credit Card" },
  { id: "INV-2026-002", patient: "Robert Kim", date: "Jul 10, 2026", amount: 42000, paid: 42000, status: "Paid", method: "Insurance" },
  { id: "INV-2026-003", patient: "Amanda Foster", date: "Jul 8, 2026", amount: 1200, paid: 0, status: "Pending", method: "-" },
  { id: "INV-2026-004", patient: "David Thompson", date: "Jul 5, 2026", amount: 12000, paid: 5000, status: "Partial", method: "UPI" },
  { id: "INV-2026-005", patient: "Sarah Lee", date: "Jun 28, 2026", amount: 2500, paid: 2500, status: "Paid", method: "Card" },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function downloadInvoice(inv: (typeof initialInvoices)[number]) {
  const text = [
    "Sri Saraswathi Dental Clinic — Tax Invoice",
    "866, Soli Complex, Surampatti Four Rd, Erode 638009 · 0424 427 2494",
    "",
    `Invoice: ${inv.id}`,
    `Patient: ${inv.patient}`,
    `Date: ${inv.date}`,
    `Amount: ${inr(inv.amount)}`,
    `Paid: ${inr(inv.paid)}`,
    `Balance: ${inr(inv.amount - inv.paid)}`,
    `Status: ${inv.status}`,
    `Method: ${inv.method}`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient: "", date: "", amount: "", method: "Credit Card" });

  const pendingTotal = invoices.reduce((sum, inv) => sum + inv.amount - inv.paid, 0);
  const filtered = invoices.filter(
    (inv) =>
      inv.patient.toLowerCase().includes(query.toLowerCase()) ||
      inv.id.toLowerCase().includes(query.toLowerCase())
  );

  const handleCreate = () => {
    const amount = Number(form.amount);
    if (!form.patient.trim() || !form.date || !amount || amount <= 0) {
      toast.error("Fill in patient, date and a valid amount");
      return;
    }
    const id = `INV-2026-${String(invoices.length + 1).padStart(3, "0")}`;
    setInvoices((current) => [
      {
        id,
        patient: form.patient.trim(),
        date: new Date(form.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        amount,
        paid: 0,
        status: "Pending",
        method: form.method,
      },
      ...current,
    ]);
    toast.success(`${id} created for ${form.patient.trim()}`);
    setForm({ patient: "", date: "", amount: "", method: "Credit Card" });
    setOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
          <h1 className="mt-3 text-display-3 text-foreground">Billing</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Manage invoices, payments, and insurance claims.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Invoice</Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Revenue Today" value="₹86,400" icon={DollarSign} variant="success" />
        <StatsCard title="Revenue This Month" value="₹12,45,000" icon={TrendingUp} variant="primary" />
        <StatsCard title="Pending Payments" value={inr(pendingTotal)} icon={CreditCard} variant="warning" />
        <StatsCard title="Insurance Claims" value="12" icon={FileText} variant="default" />
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice or patient..."
            aria-label="Search invoices"
            className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-border/70 bg-secondary-50/50">
              {["Invoice #", "Patient", "Date", "Amount", "Paid", "Balance", "Status", "Method", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary-50/60">
                <td className="px-4 py-3 text-sm font-medium text-primary-700">{inv.id}</td>
                <td className="px-4 py-3 text-sm text-foreground">{inv.patient}</td>
                <td className="px-4 py-3 text-sm text-foreground/75">{inv.date}</td>
                <td className="px-4 py-3 text-sm text-foreground">{inr(inv.amount)}</td>
                <td className="px-4 py-3 text-sm text-foreground/75">{inr(inv.paid)}</td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{inr(inv.amount - inv.paid)}</td>
                <td className="px-4 py-3">
                  <Badge variant={
                    inv.status === "Paid" ? "success" :
                    inv.status === "Pending" ? "warning" : "info"
                  }>{inv.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{inv.method}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => downloadInvoice(inv)}
                    aria-label={`Download invoice ${inv.id}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary-100 hover:text-primary-700"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No invoices match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New Invoice" description="Create an invoice and share it with the patient.">
        <div className="space-y-4">
          <Input label="Patient name" required value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} placeholder="Full name" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Invoice date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Amount (₹)" type="number" required min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </div>
          <Select
            label="Payment method"
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            options={[
              { value: "Credit Card", label: "Credit card" },
              { value: "UPI", label: "UPI" },
              { value: "Insurance", label: "Insurance" },
              { value: "Cash", label: "Cash" },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}><FileText className="h-4 w-4" /> Create invoice</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
