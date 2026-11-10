import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { Download, Eye, FileImage, FileText, Search, Upload } from "lucide-react";

type DocumentItem = {
  id: number;
  name: string;
  type: string;
  date: string;
  size: string;
  status: "Final" | "Draft" | "Pending";
};

const initialDocuments: DocumentItem[] = [
  { id: 1, name: "Patient X-ray - Jessica Martinez", type: "X-Ray", date: "Jul 12, 2026", size: "2.4 MB", status: "Final" },
  { id: 2, name: "Treatment Plan - Robert Kim", type: "Document", date: "Jul 10, 2026", size: "1.1 MB", status: "Draft" },
  { id: 3, name: "Lab Report - Crown Fabrication", type: "Lab Report", date: "Jul 8, 2026", size: "0.8 MB", status: "Final" },
  { id: 4, name: "Referral Letter - David Thompson", type: "Referral", date: "Jul 5, 2026", size: "0.3 MB", status: "Final" },
  { id: 5, name: "CBCT Scan - Full Mouth", type: "CBCT", date: "Jun 28, 2026", size: "45.2 MB", status: "Final" },
  { id: 6, name: "Insurance Claim Form", type: "Form", date: "Jun 25, 2026", size: "0.5 MB", status: "Pending" },
];

const documentTypes = ["X-Ray", "CBCT", "Document", "Lab Report", "Referral", "Form"];

const isImage = (type: string) => type === "X-Ray" || type === "CBCT";

const downloadDocument = (doc: DocumentItem) => {
  const content = [
    "Sri Saraswathi Dental Clinic — Document record",
    "",
    `Name: ${doc.name}`,
    `Type: ${doc.type}`,
    `Date: ${doc.date}`,
    `Size: ${doc.size}`,
    `Status: ${doc.status}`,
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Downloading ${doc.name}`);
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState({ name: "", type: "Document", file: "", size: "" });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (doc) => doc.name.toLowerCase().includes(term) || doc.type.toLowerCase().includes(term),
    );
  }, [documents, search]);

  const handleUpload = () => {
    if (!form.name.trim()) {
      toast.error("Please enter a document name");
      return;
    }
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    setDocuments((prev) => [
      {
        id: prev.reduce((max, d) => Math.max(max, d.id), 0) + 1,
        name: form.name.trim(),
        type: form.type,
        date: today,
        size: form.size || "—",
        status: "Draft",
      },
      ...prev,
    ]);
    toast.success(`${form.name} uploaded`);
    setForm({ name: "", type: "Document", file: "", size: "" });
    setUploadOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
          <h1 className="mt-3 text-display-3 text-foreground">Document Management</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Store and manage X-rays, photos, treatment plans, and lab reports.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload Document</Button>
      </div>

      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload document" description="Add a record to the patient document library.">
        <div className="space-y-4">
          <Input label="Document name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Patient X-ray - Sarah Lee" />
          <Select
            label="Document type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={documentTypes.map((t) => ({ value: t, label: t }))}
          />
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-foreground/80">Attach file (optional)</label>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setForm((prev) => ({
                  ...prev,
                  name: prev.name || (file ? file.name.replace(/\.[^.]+$/, "") : prev.name),
                  file: file?.name ?? "",
                  size: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : prev.size,
                }));
              }}
              className="block w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[12px] text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-[11px] file:font-medium file:text-primary-700"
            />
            {form.file && <p className="mt-1.5 text-[11px] text-muted-foreground">Selected: {form.file} · {form.size}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload}><Upload className="h-4 w-4" /> Upload</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.name ?? "Document preview"} description="Read-only preview of the stored record.">
        {preview && (
          <div className="space-y-4">
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-secondary-50/50 p-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                {isImage(preview.type) ? <FileImage className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
              </span>
              <div>
                <p className="text-[13px] font-medium text-foreground">{preview.name}</p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {preview.type} · {preview.size} · uploaded {preview.date}
                </p>
              </div>
              <Badge variant={preview.status === "Final" ? "success" : preview.status === "Draft" ? "warning" : "default"}>{preview.status}</Badge>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
              <Button onClick={() => downloadDocument(preview)}><Download className="h-4 w-4" /> Download</Button>
            </div>
          </div>
        )}
      </Modal>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name or type..."
            className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-soft">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-border/70 bg-secondary-50/50">
              {["Name", "Type", "Date", "Size", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} className="border-b border-border/60 transition-colors hover:bg-secondary-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      {isImage(doc.type) ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <span className="font-medium text-foreground">{doc.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={isImage(doc.type) ? "info" : doc.type === "Lab Report" ? "purple" : "default"} size="sm">{doc.type}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-foreground/75">{doc.date}</td>
                <td className="px-4 py-3 text-sm text-foreground/75">{doc.size}</td>
                <td className="px-4 py-3">
                  <Badge variant={doc.status === "Final" ? "success" : doc.status === "Draft" ? "warning" : "default"} size="sm">{doc.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPreview(doc)}
                      aria-label={`Preview ${doc.name}`}
                      className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:bg-secondary-50/60 hover:text-primary-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => downloadDocument(doc)}
                      aria-label={`Download ${doc.name}`}
                      className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:bg-secondary-50/60 hover:text-primary-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">No documents match "{search}"</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Try a different name or type.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
