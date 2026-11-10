import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { Megaphone, TrendingUp, Users, Star, Eye, Plus } from "lucide-react";

type CampaignStatus = "Active" | "Scheduled" | "Draft" | "Paused";

type Campaign = {
  id: number;
  name: string;
  type: string;
  status: CampaignStatus;
  reach: number;
  conversions: number;
  roi: string;
};

const initialCampaigns: Campaign[] = [
  { id: 1, name: "Summer Smile Special", type: "Promotional", status: "Active", reach: 12500, conversions: 48, roi: "320%" },
  { id: 2, name: "New Patient Welcome", type: "Email", status: "Active", reach: 3200, conversions: 28, roi: "180%" },
  { id: 3, name: "Referral Program Q3", type: "Referral", status: "Scheduled", reach: 0, conversions: 0, roi: "-" },
  { id: 4, name: "Teeth Whitening Blast", type: "Social Media", status: "Draft", reach: 0, conversions: 0, roi: "-" },
];

const campaignTypes = ["Promotional", "Email", "Referral", "Social Media", "SMS/WhatsApp"];

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Promotional", status: "Draft" as CampaignStatus });

  const activeCount = campaigns.filter((c) => c.status === "Active").length;
  const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

  const handleCreate = () => {
    if (!form.name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    setCampaigns((prev) => [
      {
        id: prev.reduce((max, c) => Math.max(max, c.id), 0) + 1,
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        reach: 0,
        conversions: 0,
        roi: "-",
      },
      ...prev,
    ]);
    toast.success(`Campaign "${form.name}" created`);
    setForm({ name: "", type: "Promotional", status: "Draft" });
    setCampaignOpen(false);
  };

  const toggleCampaign = (campaign: Campaign) => {
    const nextStatus: CampaignStatus = campaign.status === "Active" ? "Paused" : "Active";
    setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status: nextStatus } : c)));
    toast.success(`${campaign.name} ${nextStatus === "Active" ? "activated" : "paused"}`);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
          <h1 className="mt-3 text-display-3 text-foreground">Marketing</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Campaigns, patient testimonials, reviews and local SEO.</p>
        </div>
        <Button onClick={() => setCampaignOpen(true)}><Plus className="h-4 w-4" /> New Campaign</Button>
      </div>

      <Modal isOpen={campaignOpen} onClose={() => setCampaignOpen(false)} title="New campaign" description="Launch a new patient acquisition or retention campaign.">
        <div className="space-y-4">
          <Input label="Campaign name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monsoon Smile Offer" />
          <Select
            label="Channel"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={campaignTypes.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Initial status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CampaignStatus })}
            options={[
              { value: "Draft", label: "Draft" },
              { value: "Scheduled", label: "Scheduled" },
              { value: "Active", label: "Active" },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Megaphone className="h-4 w-4" /> Create campaign</Button>
          </div>
        </div>
      </Modal>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total reach" value={totalReach.toLocaleString("en-IN")} icon={Eye} trend={{ value: 18, isUp: true }} variant="primary" />
        <StatsCard title="New leads" value={totalConversions * 3} icon={Users} trend={{ value: 12, isUp: true }} variant="success" />
        <StatsCard title="Conversion rate" value={`${totalReach ? ((totalConversions / totalReach) * 100).toFixed(1) : "0.0"}%`} icon={TrendingUp} trend={{ value: 2, isUp: true }} variant="default" />
        <StatsCard title="Online reviews" value="4.9" icon={Star} trend={{ value: 3, isUp: true }} variant="default" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
          <Badge variant="info">{activeCount} active</Badge>
        </div>
        <div className="space-y-4">
          {campaigns.map((camp) => (
            <div key={camp.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:bg-secondary-50/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{camp.name}</p>
                  <p className="text-sm text-muted-foreground">{camp.type}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Reach</p>
                  <p className="font-medium text-foreground">{camp.reach.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Conversions</p>
                  <p className="font-medium text-foreground">{camp.conversions}</p>
                </div>
                {camp.roi !== "-" && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className="font-medium text-green-700">{camp.roi}</p>
                  </div>
                )}
                <Badge variant={
                  camp.status === "Active" ? "success" :
                  camp.status === "Scheduled" ? "info" :
                  camp.status === "Paused" ? "warning" : "default"
                }>{camp.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggleCampaign(camp)}>
                  {camp.status === "Active" ? "Pause" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
