import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/ui/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { Package, AlertTriangle, Plus, Search } from "lucide-react";

type InventoryStatus = "OK" | "Low" | "Critical";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  min: number;
  unit: string;
  expiry: string;
};

const initialItems: InventoryItem[] = [
  { id: 1, name: "Composite Resin - A2", category: "Material", quantity: 15, min: 10, unit: "syringes", expiry: "Dec 2026" },
  { id: 2, name: "Dental Implants - Straumann", category: "Implant", quantity: 5, min: 5, unit: "units", expiry: "N/A" },
  { id: 3, name: "Lidocaine 2%", category: "Medicine", quantity: 25, min: 20, unit: "cartridges", expiry: "Aug 2026" },
  { id: 4, name: "Alginate Impression", category: "Material", quantity: 3, min: 10, unit: "boxes", expiry: "Oct 2026" },
  { id: 5, name: "Surgical Gloves - Size 7.5", category: "Consumable", quantity: 200, min: 100, unit: "pairs", expiry: "N/A" },
  { id: 6, name: "Invisalign Aligners", category: "Aligner", quantity: 8, min: 5, unit: "sets", expiry: "N/A" },
  { id: 7, name: "Crowns - Zirconia", category: "Material", quantity: 4, min: 5, unit: "units", expiry: "N/A" },
  { id: 8, name: "Sterilization Pouches", category: "Consumable", quantity: 2, min: 10, unit: "boxes", expiry: "N/A" },
];

const getStatus = (item: InventoryItem): InventoryStatus => {
  if (item.quantity === 0 || item.quantity <= Math.floor(item.min / 2)) return "Critical";
  if (item.quantity <= item.min) return "Low";
  return "OK";
};

const categories = ["Material", "Implant", "Medicine", "Consumable", "Aligner"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Material",
    quantity: "",
    min: "",
    unit: "units",
    expiry: "",
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term));
  }, [items, search]);

  const lowCount = items.filter((item) => getStatus(item) === "Low").length;
  const criticalCount = items.filter((item) => getStatus(item) === "Critical").length;

  const handleReorder = (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const restock = Math.max(item.min * 2 - item.quantity, item.min);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + restock } : i)));
    toast.success(`${item.name} restocked with ${restock} ${item.unit}`);
  };

  const handleAddItem = () => {
    const quantity = Number(form.quantity);
    const min = Number(form.min);
    if (!form.name.trim() || !form.quantity || !form.min || Number.isNaN(quantity) || Number.isNaN(min) || quantity < 0 || min < 0) {
      toast.error("Please enter a valid item name, quantity and minimum level");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: prev.reduce((max, i) => Math.max(max, i.id), 0) + 1,
        name: form.name.trim(),
        category: form.category,
        quantity,
        min,
        unit: form.unit.trim() || "units",
        expiry: form.expiry.trim() || "N/A",
      },
    ]);
    toast.success(`${form.name} added to inventory`);
    setForm({ name: "", category: "Material", quantity: "", min: "", unit: "units", expiry: "" });
    setAddOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
          <h1 className="mt-3 text-display-3 text-foreground">Inventory</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Track materials, instruments, implants, and consumables.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add Item</Button>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add inventory item" description="Register a new material, medicine or consumable." size="lg">
        <div className="space-y-4">
          <Input label="Item name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Composite Resin - A3" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="units" />
            <Input label="Quantity" type="number" min={0} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
            <Input label="Minimum level" type="number" min={0} required value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} placeholder="0" />
          </div>
          <Input label="Expiry (optional)" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} placeholder="e.g. Dec 2026" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItem}><Package className="h-4 w-4" /> Add item</Button>
          </div>
        </div>
      </Modal>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total listings" value={items.length} icon={Package} variant="primary" />
        <StatsCard title="Low stock items" value={lowCount} icon={AlertTriangle} variant="warning" />
        <StatsCard title="Critical items" value={criticalCount} icon={AlertTriangle} variant="danger" />
        <StatsCard title="Expiry tracked" value={items.filter((i) => i.expiry !== "N/A").length} icon={Package} variant="default" />
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory..."
            className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border/70 bg-secondary-50/50">
              {["Item", "Category", "Quantity", "Min Level", "Expiry", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className="border-b border-border/60 transition-colors hover:bg-secondary-50/60">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={
                      item.category === "Material" ? "default" :
                      item.category === "Implant" ? "info" :
                      item.category === "Medicine" ? "warning" : "purple"
                    } size="sm">{item.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/75">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-3 text-sm text-foreground/75">{item.min}</td>
                  <td className="px-4 py-3 text-sm text-foreground/75">{item.expiry}</td>
                  <td className="px-4 py-3">
                    <Badge variant={status === "OK" ? "success" : status === "Low" ? "warning" : "danger"}>{status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleReorder(item.id)}
                      className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
                    >
                      Reorder
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">No items match "{search}"</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Try a different name or category.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
