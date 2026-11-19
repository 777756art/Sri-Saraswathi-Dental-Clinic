import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import { Save, Shield, Bell, Palette, Link, MessageSquare, Sliders, Lock, RefreshCw, Key, UserCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { WhatsAppAutomationSettings } from "@/components/dashboard/WhatsAppAutomationSettings";
import { WebsiteColoursSettings } from "@/components/dashboard/WebsiteColoursSettings";
import { api, type AdminProfile, type AdminActivityLog } from "@/lib/api";
import { useClinicSettings } from "@/lib/clinic-settings";

const initialIntegrations = [
  { name: "Google Business Profile", desc: "Sync reviews via official Google Places API or manage manual fallback", connected: false },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings, updateSettings } = useClinicSettings();
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
  const [googleStatusLabel, setGoogleStatusLabel] = useState<string>("Checking...");

  useEffect(() => {
    api
      .getAdminGoogleReviews()
      .then((res) => {
        const apiReady = Boolean(res?.apiConfigured && res?.status === "synced");
        setIntegrations((prev) =>
          prev.map((item) =>
            item.name === "Google Business Profile" ? { ...item, connected: apiReady } : item
          )
        );
        if (apiReady) {
          setGoogleStatusLabel("API Connected");
        } else if (res?.apiConfigured) {
          setGoogleStatusLabel("API Key Active");
        } else {
          setGoogleStatusLabel("API Key Missing");
        }
      })
      .catch(() => {
        setGoogleStatusLabel("Not Connected");
      });
  }, []);
  const [twoFA, setTwoFA] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  // Admin Identity & Profile Management
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editAdminName, setEditAdminName] = useState("Dr. Kishore Kumar");
  const [editAdminEmail, setEditAdminEmail] = useState("");

  // Admin Password Management
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Cloudflare D1 Activity Logs
  const [liveLogs, setLiveLogs] = useState<AdminActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadAdminProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.getAdminProfile();
      if (res?.profile) {
        setAdminProfile(res.profile);
        setEditAdminName(res.profile.name || "Dr. Kishore Kumar");
        setEditAdminEmail(res.profile.email || "");
      }
    } catch {
      // fallback
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadLiveLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.getAdminActivityLogs({ limit: 50 });
      if (res?.logs) {
        setLiveLogs(res.logs);
      }
    } catch {
      // fallback
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadAdminProfile();
    loadLiveLogs();
  }, []);

  const handleSaveProfile = async () => {
    if (!editAdminName.trim() || editAdminName.trim().length < 2) {
      toast.error("Please enter a valid display name (min 2 characters).");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.updateAdminProfile({
        name: editAdminName.trim(),
        email: editAdminEmail.trim() || undefined,
      });
      if (res?.profile) {
        setAdminProfile(res.profile);
        toast.success("Admin identity updated successfully!");
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Current password and new password are required.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await api.changeAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password changed successfully!");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      loadLiveLogs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

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
        defaultTab={searchParams.get("tab") || "general"}
        onChange={(tabId) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (tabId === "general") {
              next.delete("tab");
            } else {
              next.set("tab", tabId);
            }
            return next;
          });
        }}
        tabs={[
          { id: "general", label: "General", icon: <Sliders className="h-4 w-4" /> },
          { id: "colours", label: "Colours", icon: <Palette className="h-4 w-4" /> },
          { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
          { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
          { id: "integrations", label: "Integrations", icon: <Link className="h-4 w-4" /> },
          { id: "whatsapp", label: "WhatsApp Automation", icon: <MessageSquare className="h-4 w-4" /> },
        ]}
      >
        {(activeTab) => (
          <Card>
            {activeTab === "colours" && (
              <WebsiteColoursSettings />
            )}
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
              <div className="space-y-6">
                {/* 1. Admin Identity & Profile Management */}
                <div className="rounded-2xl border border-secondary-100 bg-secondary-50/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-secondary-200/60 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1F6878] text-base font-bold text-white shadow-sm">
                        DK
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[#1F6878]">
                            {adminProfile?.name || "Dr. Kishore Kumar"}
                          </h2>
                          <Badge variant="success">Super Admin</Badge>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <p className="text-[12px] text-muted-foreground">
                          {adminProfile?.email || "admin@srisaraswathidental.com"}
                          {adminProfile?.lastLoginAt && (
                            <> · Last signed in: {new Date(adminProfile.lastLoginAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</>
                          )}
                          {adminProfile?.loginCount ? ` · ${adminProfile.loginCount} logins` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <h3 className="text-sm font-semibold text-[#1F6878]">Update Admin Identity</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Admin Display Name"
                        required
                        value={editAdminName}
                        onChange={(e) => setEditAdminName(e.target.value)}
                        placeholder="Dr. Kishore Kumar"
                      />
                      <Input
                        label="Verified Admin Email"
                        type="email"
                        required
                        value={editAdminEmail}
                        onChange={(e) => setEditAdminEmail(e.target.value)}
                        placeholder="admin@srisaraswathidental.com"
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={savingProfile}>
                      <Save className="h-4 w-4" /> {savingProfile ? "Saving Profile…" : "Save Admin Profile"}
                    </Button>
                  </div>
                </div>

                {/* 2. Password Security */}
                <div className="rounded-2xl border border-secondary-100 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-[#1F6878]">
                        <Key className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Password & Credential Security</p>
                        <p className="text-xs text-muted-foreground">Protected by salted scrypt cryptographic hashing. Plaintext passwords are never stored.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordForm((v) => !v)}
                    >
                      <Lock className="h-4 w-4" /> {showPasswordForm ? "Cancel" : "Change Password"}
                    </Button>
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handleChangePassword} className="mt-5 max-w-lg space-y-3.5 rounded-xl border border-secondary-200/80 bg-white p-4">
                      <h4 className="text-sm font-semibold text-[#1F6878]">Change Administrator Password</h4>
                      <Input
                        label="Current Password"
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <Input
                        label="New Password (min 8 chars)"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new strong password"
                      />
                      <Input
                        label="Confirm New Password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                      />
                      <div className="flex items-center gap-2 pt-2">
                        <Button type="submit" disabled={changingPassword}>
                          {changingPassword ? "Updating Password…" : "Update Password"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 3. Authentication & Access Safeguards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-secondary-100 bg-secondary-50/50 p-4">
                    <p className="text-xs font-semibold text-[#1F6878]">Brute-Force Protection</p>
                    <p className="mt-1 text-sm font-medium text-foreground">Active · 5 Attempts Lock</p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">Sliding window rate-limiter with 15-minute temporary IP lockout.</p>
                  </div>
                  <div className="rounded-xl border border-secondary-100 bg-secondary-50/50 p-4">
                    <p className="text-xs font-semibold text-[#1F6878]">Session Security</p>
                    <p className="mt-1 text-sm font-medium text-foreground">7 Days · Cryptographic HMAC</p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">HttpOnly, SameSite=Lax, and Secure flags applied to sc_session cookie.</p>
                  </div>
                  <div className="rounded-xl border border-secondary-100 bg-secondary-50/50 p-4">
                    <p className="text-xs font-semibold text-[#1F6878]">Server-Side Authorization</p>
                    <p className="mt-1 text-sm font-medium text-foreground">Active RBAC</p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground">Strict requireAdmin verification on all Cloudflare D1 mutation endpoints.</p>
                  </div>
                </div>

                {/* 4. Live Cloudflare D1 Activity & Security Audit Logs */}
                <div className="rounded-2xl border border-secondary-100 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary-100 pb-3">
                    <div>
                      <p className="font-semibold text-foreground">Cloudflare D1 Security & Activity Logs</p>
                      <p className="text-xs text-muted-foreground">Real-time audit trail of administrator sign-ins, profile changes, and clinic updates.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingLogs}
                        onClick={loadLiveLogs}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} /> Refresh Logs
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowLogs((v) => !v)}>
                        {showLogs ? "Hide Logs" : "View Logs"}
                      </Button>
                    </div>
                  </div>

                  {showLogs && (
                    <div className="mt-3 divide-y divide-secondary-100">
                      {liveLogs.length === 0 ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">No activity logs recorded yet.</p>
                      ) : (
                        liveLogs.map((log) => (
                          <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                  log.action.includes("FAILED")
                                    ? "bg-red-100 text-red-700"
                                    : log.action.includes("LOGIN") || log.action.includes("SUCCESS")
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {log.action}
                                </span>
                                <span className="font-semibold text-foreground">{log.admin_name || "Dr. Kishore Kumar"}</span>
                              </div>
                              <p className="text-[11.5px] text-muted-foreground">{log.details}</p>
                            </div>
                            <div className="text-right text-[11px] text-muted-foreground">
                              <p>{new Date(log.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                              {log.ip_address && <p className="font-mono text-[10px] text-secondary-500">IP: {log.ip_address}</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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
                        <span className="text-sm text-muted-foreground">
                          {int.name === "Google Business Profile"
                            ? googleStatusLabel
                            : int.connected
                              ? "Connected"
                              : "Not Connected"}
                        </span>
                      </div>
                      {int.name === "Google Business Profile" ? (
                        <RouterLink to="/dashboard/google-reviews">
                          <Button variant="outline" size="sm">
                            Manage Reviews
                          </Button>
                        </RouterLink>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => toggleIntegration(int.name)}>
                          {int.connected ? "Disconnect" : "Connect"}
                        </Button>
                      )}
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
