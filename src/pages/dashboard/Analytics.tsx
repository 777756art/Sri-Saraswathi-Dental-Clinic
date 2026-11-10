import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card } from "@/components/ui/Card";
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Activity } from "lucide-react";

const metrics = [
  { title: "Appointment Utilization", value: "85%", icon: Calendar, trend: { value: 5, isUp: true }, variant: "primary" as const },
  { title: "Treatment Acceptance", value: "72%", icon: Activity, trend: { value: 3, isUp: true }, variant: "success" as const },
  { title: "New vs Returning", value: "35/65", icon: Users, trend: { value: 8, isUp: true }, variant: "primary" as const },
  { title: "No-Show Rate", value: "4.2%", icon: TrendingUp, trend: { value: 1, isUp: false }, variant: "warning" as const },
  { title: "Avg Revenue/Patient", value: "₹3,500", icon: DollarSign, trend: { value: 12, isUp: true }, variant: "success" as const },
  { title: "Patient Satisfaction", value: "4.9/5", icon: BarChart3, trend: { value: 2, isUp: true }, variant: "primary" as const },
];

const revenueData = [
  { procedure: "General Dentistry", revenue: 652000, count: 182 },
  { procedure: "Cosmetic Dentistry", revenue: 485000, count: 45 },
  { procedure: "Dental Implants", revenue: 820000, count: 12 },
  { procedure: "Orthodontics", revenue: 540000, count: 18 },
  { procedure: "Teeth Whitening", revenue: 124000, count: 42 },
  { procedure: "Root Canal", revenue: 95000, count: 11 },
  { procedure: "Crowns & Bridges", revenue: 188000, count: 14 },
  { procedure: "Other", revenue: 156000, count: 95 },
];

const topProcedures = [
  { name: "Check-up & Cleaning", count: 210, revenue: 210000 },
  { name: "Teeth Whitening", count: 42, revenue: 124000 },
  { name: "Fillings", count: 38, revenue: 95000 },
  { name: "Crowns", count: 14, revenue: 88000 },
  { name: "Implants", count: 12, revenue: 320000 },
];

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
        <h1 className="mt-3 text-display-3 text-foreground">Analytics</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">Track performance metrics and business insights.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <StatsCard key={m.title} {...m} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Procedure */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Revenue by Procedure</h2>
          <div className="space-y-3">
            {revenueData.map((item) => (
              <div key={item.procedure}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground/75">{item.procedure}</span>
                  <span className="font-medium text-foreground">₹{item.revenue.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                    style={{ width: `${(item.revenue / 820000) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{item.count} procedures</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Procedures */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Top Procedures This Month</h2>
          <div className="space-y-4">
            {topProcedures.map((proc, idx) => (
              <div key={proc.name} className="flex items-center justify-between border-b border-secondary-100 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-700">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{proc.name}</p>
                    <p className="text-sm text-muted-foreground">{proc.count} procedures</p>
                  </div>
                </div>
                <p className="font-semibold text-foreground">₹{proc.revenue.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
