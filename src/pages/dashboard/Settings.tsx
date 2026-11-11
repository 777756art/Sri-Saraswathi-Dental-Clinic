import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import { Save, Shield, Bell, Palette, Link, MessageSquare } from "lucide-react";
import { WhatsAppAutomationSettings } from "@/components/dashboard/WhatsAppAutomationSettings";
import { useClinicSettings } from "@/lib/clinic-settings";

const initialIntegrations = [
  { name: "Google Business Profile", desc: "Sync reviews and manage listings", connected: true },
  { name: "Razorpay Payments", desc: "UPI, cards and netbanking collection", connected: true },
  { name: "Twilio SMS/WhatsApp", desc: "Automated patient messaging", connected: true },
  { name: "LiveKit Video", desc: "Tele-dentistry consultations", connected: false },
  { name: "OpenAI", desc: "AI-powered dental assistant", connected: true },
  { name: "Practo", desc: "Patient discovery and booking", connected: false },
];

const notificationPrefs = [
  "Appointment Reminders",
  "Follow-up Alerts",
  "Billing Notifications",
  "Patient Review Requests",
  "Low Stock Alerts",
  "Staff Schedule Changes",
];

const auditLogs = [
  { action: "Invoice INV-2026-004 marked paid", user: "Maria Garcia", time: "Today, 11:42 AM" },
  { action: "New patient record created", user: "Riya Sharma", time: "Today, 11:08 AM" },
  { action: "Treatment plan updated", user: "Dr. Kishore Kumar", time: "Today, 10:26 AM" },
  { action: "Inventory reorder raised", user: "Dr. Kishore Kumar", time: "Yesterday, 5:14 PM" },
];

export default function SettingsPage() {
  const { settings, updateSettings, loading: loadingSettings } = useClinicSettings();
  const [clinic, setClinic] = useState({
    name: settings.clinicName,
    phone: settings.phone,
    address: settings.address,
    email: settings.email,
    gstin: "33ABCDE1234F1Z5",
    timezone: "Asia/Kolkata",
  });
  const [savingClinic, setSavingClinic] = useState(false);

  useEffect(() => {
    setClinic((prev) => ({
      ...prev,
      name: settings.clinicName || prev.name,
      phone: settings.phone || prev.phone,
      address: settings.address || prev.address,
      email: settings.email || prev.email,
    }));
  }, [settings]);

  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(notificationPrefs.map((item) => [item, true])),
  );
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [twoFA, setTwoFA] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const saveClinic = async () => {
    if (!clinic.name.trim() || !clinic.phone.trim() || !clinic.email.trim()) {
      toast.error("Clinic name, phone and email are required");
      return;
    }
    setSavingClinic(true);
    try {
      await updateSettings({
        clinicName: clinic.name,
        phone: clinic.phone,
        address: clinic.address,
        email: clinic.email,
      });
      toast.success("Clinic settings saved to Cloudflare D1");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save clinic settings.");
    } finally {
      setSavingClinic(false);
    }
  };

  const savePrefs = () => toast.success("Notification preferences saved");

  const toggleIntegration = (name: string) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.name === name ? { ...item, connected: !item.connected } : item)),
    );
    const target = integrations.find((item) => item.name === name);
    toast.success(`${name} ${target?.connected ? "disconnected" : "connected"}`);
  };
  return (
    <DashboardLayout>
      <div className="mb-6">
        <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
        <h1 className="mt-3 text-display-3 text-[#1F6878]">Settings</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">Manage clinic settings, permissions, and preferences.</p>
      </div>

      <Tabs
        tabs={[
          { id: "general", label: "General", icon: <Palette className="h-4 w-4" /> },
          { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
          { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
          { id: "integrations", label: "Integrations", icon: <Link className="h-4 w-4" /> },
          { id: "whatsapp", label: "WhatsApp Automation", icon: <MessageSquare className="h-4 w-4" /> },
        ]}
      >
        {(activeTab) => (
          <Card>
            {activeTab === "general" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1F6878]">Clinic Information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Clinic Name" required value={clinic.name} onChange={(e) => setClinic({ ...clinic, name: e.target.value })} />
                  <Input label="Phone" required value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} />
                  <div className="sm:col-span-2">
                    <Input label="Address" value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} />
                  </div>
                  <Input label="Email" type="email" required value={clinic.email} onChange={(e) => setClinic({ ...clinic, email: e.target.value })} />
                  <Input label="GSTIN" value={clinic.gstin} onChange={(e) => setClinic({ ...clinic, gstin: e.target.value })} />
                  <Select
                    label="Timezone"
                    value={clinic.timezone}
                    onChange={(e) => setClinic({ ...clinic, timezone: e.target.value })}
                    options={[
                      { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
                      { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
                      { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
                    ]}
                  />
                  <Select
                    label="Currency"
                    defaultValue="INR"
                    disabled
                    options={[{ value: "INR", label: "Indian Rupee (₹) · clinic default" }]}
                  />
                </div>
                <Button onClick={saveClinic} disabled={savingClinic}><Save className="h-4 w-4" /> {savingClinic ? "Saving…" : "Save Changes"}</Button>
              </div>
            )}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1F6878]">Notification Preferences</h2>
                {notificationPrefs.map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-secondary-100 p-3">
                    <span className="text-sm text-foreground/75">{item}</span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={prefs[item]}
                        onChange={() => setPrefs((prev) => ({ ...prev, [item]: !prev[item] }))}
                      />
                      <div className="h-6 w-11 rounded-full bg-secondary-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-card after:transition-all peer-checked:bg-[#1F6878] peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
                <Button onClick={savePrefs}><Save className="h-4 w-4" /> Save preferences</Button>
              </div>
            )}
            {activeTab === "security" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1F6878]">Security Settings</h2>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-100 p-3">
                    <div>
                      <p className="font-medium text-foreground">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={twoFA ? "success" : "default"}>{twoFA ? "Enabled" : "Disabled"}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTwoFA((v) => !v);
                          toast.success(twoFA ? "Two-factor authentication disabled" : "Two-factor authentication enabled");
                        }}
                      >
                        {twoFA ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-100 p-3">
                    <div>
                      <p className="font-medium text-foreground">Password</p>
                      <p className="text-sm text-muted-foreground">Last changed 3 months ago</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.success("Password reset link sent to the registered email")}>
                      Change
                    </Button>
                  </div>
                  <div className="rounded-lg border border-secondary-100 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Audit Logs</p>
                        <p className="text-sm text-muted-foreground">Track all user activities</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowLogs((v) => !v)}>
                        {showLogs ? "Hide Logs" : "View Logs"}
                      </Button>
                    </div>
                    {showLogs && (
                      <div className="mt-3 space-y-2 border-t border-secondary-100 pt-3">
                        {auditLogs.map((log) => (
                          <div key={log.action + log.time} className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                            <span className="text-foreground/80">{log.action}</span>
                            <span className="text-muted-foreground">{log.user} · {log.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-100 p-3">
                    <div>
                      <p className="font-medium text-foreground">Data Retention</p>
                      <p className="text-sm text-muted-foreground">Auto-delete records after 7 years</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toast.success("Retention policy confirmed for 7 years")}>
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "whatsapp" && (
              <WhatsAppAutomationSettings />
            )}
            {activeTab === "integrations" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[#1F6878]">Integrations</h2>
                {integrations.map((int) => (
                  <div key={int.name} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-100 p-3">
                    <div>
                      <p className="font-medium text-foreground">{int.name}</p>
                      <p className="text-sm text-muted-foreground">{int.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${int.connected ? "bg-[#1F6878]" : "bg-secondary-300"}`} />
                        <span className="text-sm text-muted-foreground">{int.connected ? "Connected" : "Not Connected"}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toggleIntegration(int.name)}>
                        {int.connected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </Tabs>
    </DashboardLayout>
  );
}
