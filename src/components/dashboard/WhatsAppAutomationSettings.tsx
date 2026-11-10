import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Server,
  Key,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Smartphone,
  Eye,
} from "lucide-react";
import { api, ApiError, type WhatsAppSettings, type WhatsAppLogItem } from "@/lib/api";

const defaultSettingsState: WhatsAppSettings = {
  enabled: true,
  clinicPhone: "9345743409",
  clinicInternational: "+919345743409",
  clinicName: "Sri Saraswathi Dental Clinic",
  provider: "green_api",
  greenApiInstanceId: "",
  greenApiToken: "",
  ultraMsgInstanceId: "",
  ultraMsgToken: "",
  n8nWebhookUrl: "",
  n8nAuthToken: "",
  metaPhoneNumberId: "",
  metaWabaId: "",
  metaAccessToken: "",
  metaAccessTokenConfigured: false,
  metaAccessTokenPreview: "",
  notifyNewBooking: true,
  notifyConfirmed: true,
  notifyRejected: true,
  notifyRescheduled: true,
  notifyReminder: true,
  notifyCustomReply: true,
  templates: {
    newBookingClinic: "🔔 NEW APPOINTMENT RECEIVED!\n\nSri Saraswathi Dental Clinic\n\nAppointment ID: {appointment_id}\nPatient Name: {patient_name}\nPhone: {patient_phone}\nTreatment: {treatment_name}\nRequested Date: {appointment_date}\nRequested Time: {appointment_time}\n\nPlease check your availability and approve this appointment through the Admin Dashboard.\n\nStatus: PENDING",
    patientConfirmed: "✅ APPOINTMENT CONFIRMED!\n\nDear {patient_name},\n\nYour appointment at Sri Saraswathi Dental Clinic has been confirmed.\n\nAppointment ID: {appointment_id}\nTreatment: {treatment_name}\nDate: {appointment_date}\nTime: {appointment_time}\nDoctor: {doctor_name}\nLocation: Sri Saraswathi Dental Clinic, 47, Perundurai Road, Erode - 638011\n\nNeed directions or rescheduling? Contact us at +919345743409.\nSee you soon!",
    patientRejected: "❌ APPOINTMENT UPDATE\n\nDear {patient_name},\n\nWe regret to inform you that your requested appointment could not be confirmed.\n\nAppointment ID: {appointment_id}\nRequested Date: {appointment_date}\nReason: {rejection_reason}\n\nPlease call us at +919345743409 or book another time slot online.\n— Sri Saraswathi Dental Clinic",
    patientRescheduled: "🗓️ APPOINTMENT RESCHEDULED\n\nDear {patient_name},\n\nYour appointment at Sri Saraswathi Dental Clinic has been rescheduled.\n\nAppointment ID: {appointment_id}\nTreatment: {treatment_name}\nNew Date: {appointment_date}\nNew Time: {appointment_time}\nDoctor: {doctor_name}\nLocation: Sri Saraswathi Dental Clinic, 47, Perundurai Road, Erode - 638011\n\nIf this timing does not suit you, please call us at +919345743409.",
    patientReminder: "⏰ APPOINTMENT REMINDER\n\nDear {patient_name},\n\nThis is a friendly reminder for your upcoming dental visit tomorrow at Sri Saraswathi Dental Clinic.\n\nAppointment ID: {appointment_id}\nTreatment: {treatment_name}\nDate: {appointment_date}\nTime: {appointment_time}\nDoctor: {doctor_name}\nAddress: 47, Perundurai Road, Erode - 638011\n\nWe look forward to seeing you! For queries, contact +919345743409."
  }
};

export function WhatsAppAutomationSettings() {
  const [settings, setSettings] = useState<WhatsAppSettings>(defaultSettingsState);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("9345743409");
  const [testEvent, setTestEvent] = useState("booking.created");
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WhatsAppLogItem | null>(null);

  const isLiveConfigured = Boolean(
    (settings.provider === "green_api" && settings.greenApiInstanceId?.trim() && settings.greenApiToken?.trim()) ||
    (settings.provider === "ultramsg" && settings.ultraMsgInstanceId?.trim() && settings.ultraMsgToken?.trim()) ||
    (settings.provider === "n8n" && settings.n8nWebhookUrl.trim()) ||
    (settings.provider === "meta" && settings.metaPhoneNumberId.trim() && (settings.metaAccessTokenConfigured || settings.metaAccessToken)) ||
    (settings.provider === "both" && (settings.n8nWebhookUrl.trim() || settings.metaPhoneNumberId.trim()))
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        api.get<{ settings: WhatsAppSettings }>("/api/admin/whatsapp/settings"),
        api.get<{ logs: WhatsAppLogItem[] }>("/api/admin/whatsapp/logs"),
      ]);
      if (settingsRes?.settings) {
        setSettings({
          ...defaultSettingsState,
          ...settingsRes.settings,
          templates: {
            ...defaultSettingsState.templates,
            ...(settingsRes.settings.templates || {}),
          },
        });
        if (settingsRes.settings.clinicPhone) {
          setTestPhone(settingsRes.settings.clinicPhone);
        }
      }
      if (logsRes?.logs) {
        setLogs(logsRes.logs);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load WhatsApp settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.patch<{ settings: WhatsAppSettings }>("/api/admin/whatsapp/settings", settings);
      if (res?.settings) {
        setSettings((prev) => ({
          ...prev,
          ...res.settings,
          templates: { ...prev.templates, ...(res.settings.templates || {}) },
        }));
      }
      toast.success("WhatsApp automation settings saved successfully!");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.post<{ ok: boolean; result: Record<string, unknown> }>("/api/admin/whatsapp/test", {
        phone: testPhone,
        event: testEvent,
      });
      setTestResult(res.result);
      
      const status = res.result?.status;
      if (status === "delivered") {
        toast.success(`✅ Real WhatsApp message delivered to +91${testPhone}!`);
      } else if (status === "simulated") {
        toast("ℹ️ Simulated test completed. Real WhatsApp delivery requires connecting n8n or Meta API credentials below.", {
          icon: "⚠️",
          duration: 6000,
        });
      } else {
        toast.error(`Message dispatch failed: ${String(res.result?.error || "Check credentials")}`);
      }

      // Reload logs after a test dispatch
      const logsRes = await api.get<{ logs: WhatsAppLogItem[] }>("/api/admin/whatsapp/logs");
      if (logsRes?.logs) setLogs(logsRes.logs);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Test message failed");
      setTestResult({ error: error instanceof Error ? error.message : "Execution failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Official Meta WhatsApp Cloud API &amp; n8n Automation
                </h2>
                <Badge variant={isLiveConfigured ? "success" : "warning"}>
                  {isLiveConfigured ? "Live Dispatch Ready" : "Simulation Mode (Credentials Needed)"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Automatic instant alerts for new bookings, admin confirmations, rejections, rescheduling, and 24h reminders.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                  Clinic Recipient: <strong className="font-semibold text-emerald-900">+91 {settings.clinicPhone}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Server className="h-3.5 w-3.5 text-secondary-500" />
                  Active Engine: <strong className="uppercase text-foreground">{settings.provider}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTestResult(null);
                setTestModalOpen(true);
              }}
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              <Send className="h-3.5 w-3.5 text-emerald-600" /> Send Test Notification
            </Button>
            <Button
              type="button"
              size="sm"
              loading={saving}
              onClick={() => void handleSave()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Status Alert when credentials are not yet entered */}
      {!isLiveConfigured && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-950">
              Why did the notification not arrive on your phone? (Simulation Mode Active)
            </p>
            <p className="text-amber-900 leading-relaxed">
              The booking system and message templates are 100% active, but no <strong>n8n Webhook URL</strong> or <strong>Meta WhatsApp Cloud API Token</strong> has been configured yet. Without an API connection to WhatsApp, messages are saved in your database logs as a simulation rather than sent over the cellular WhatsApp network.
            </p>
            <p className="font-medium text-amber-950 pt-1">
              👉 To receive live WhatsApp messages on <strong>+91{settings.clinicPhone}</strong>, please paste your <strong>n8n Webhook URL</strong> or <strong>Meta API Token</strong> in the boxes below and click Save.
            </p>
          </div>
        </div>
      )}

      {/* Meta Number Eligibility & Registration Guide Card */}
      <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft">
        <button
          type="button"
          onClick={() => setGuideExpanded(!guideExpanded)}
          className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground hover:text-emerald-700"
        >
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Meta WhatsApp Number Registration &amp; Cloud API Eligibility Guide
          </span>
          {guideExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {guideExpanded && (
          <div className="mt-4 space-y-3 border-t border-secondary-100 pt-4 text-xs leading-relaxed text-muted-foreground">
            <div className="rounded-xl bg-amber-500/10 p-3.5 text-amber-900">
              <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-amber-600" /> WhatsApp Number Architecture Note for +919345743409:
              </p>
              <p className="mt-1">
                Your clinic number <strong>+919345743409</strong> is set as the <strong>Clinic Recipient Number</strong>. It will receive instant WhatsApp notifications whenever a patient books an appointment online.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 p-3.5">
                <h4 className="font-semibold text-foreground">Option A: n8n Webhook + Test Sender (Ready Instantly)</h4>
                <p className="mt-1">
                  1. Deploy your n8n workflow using the template provided at <code className="rounded bg-secondary-200 px-1 py-0.5 text-[11px]">n8n/whatsapp-appointment-automation.json</code>.<br />
                  2. Paste your n8n Webhook URL below.<br />
                  3. New booking events are automatically posted to n8n, which delivers the WhatsApp alert to +919345743409.
                </p>
              </div>

              <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 p-3.5">
                <h4 className="font-semibold text-foreground">Option B: Official Meta WhatsApp Cloud API</h4>
                <p className="mt-1">
                  1. Create a Meta Business App at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">developers.facebook.com</a>.<br />
                  2. Add WhatsApp product &amp; complete Meta Business Verification.<br />
                  3. To use a phone number as the <em>sender</em>, it cannot be active inside the normal WhatsApp app on a smartphone. Use a dedicated SIM or virtual number for sending.<br />
                  4. Paste your Phone Number ID &amp; System User Token below.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Core Setup (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Automation Switch & Recipient Card */}
          <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground mb-4">1. Clinic WhatsApp Recipient &amp; Status</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Clinic WhatsApp Number (Recipient)"
                  required
                  value={settings.clinicPhone}
                  onChange={(e) => setSettings({ ...settings, clinicPhone: e.target.value.replace(/\D/g, "") })}
                  helperText="Primary clinic number that receives instant alerts on new bookings."
                />
              </div>
              <div>
                <Input
                  label="International Format"
                  disabled
                  value={settings.clinicInternational || `+91${settings.clinicPhone}`}
                  helperText="E.164 format with country code (+91 for India)."
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary-50/70 p-3.5 border border-secondary-100">
              <div>
                <p className="text-xs font-semibold text-foreground">Master Automation Toggle</p>
                <p className="text-[11px] text-muted-foreground">Enable or pause all automated WhatsApp dispatches</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                />
                <div className="peer h-6 w-11 rounded-full bg-secondary-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-secondary-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
              </label>
            </div>
          </div>

          {/* Engine & Provider Settings */}
          <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">2. Automation Engine &amp; Webhook Credentials</h3>
              <Select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as WhatsAppSettings["provider"] })}
                options={[
                  { value: "green_api", label: "Green-API (Instant WhatsApp QR - Free & Recommended)" },
                  { value: "ultramsg", label: "UltraMsg (Instant WhatsApp QR - Free)" },
                  { value: "n8n", label: "n8n Webhook Workflow" },
                  { value: "meta", label: "Meta Cloud API Direct" },
                  { value: "both", label: "Both (n8n + Meta)" },
                  { value: "simulated", label: "Simulated Test Mode (Audit Logs Only)" },
                ]}
              />
            </div>


            {settings.provider === "green_api" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    Green-API Configuration (Instant QR Scan — Zero Meta Account Needed)
                  </div>
                  <a
                    href="https://console.green-api.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Open Green-API Console ↗
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  1. Go to <a href="https://console.green-api.com" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">console.green-api.com</a> and create a free account.<br />
                  2. Scan the on-screen QR code using your WhatsApp app (<em>Linked Devices &gt; Link a Device</em>).<br />
                  3. Copy your <strong>idInstance</strong> and <strong>apiTokenInstance</strong> and paste them here:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Green-API Instance ID (idInstance)"
                    placeholder="e.g. 1101823948"
                    value={settings.greenApiInstanceId || ""}
                    onChange={(e) => setSettings({ ...settings, greenApiInstanceId: e.target.value })}
                  />
                  <Input
                    label="Green-API Token (apiTokenInstance)"
                    placeholder="e.g. 7d8f28c4b9e14a87..."
                    value={settings.greenApiToken || ""}
                    onChange={(e) => setSettings({ ...settings, greenApiToken: e.target.value })}
                  />
                </div>
              </div>
            )}

            {settings.provider === "ultramsg" && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-950">
                    <Smartphone className="h-4 w-4 text-sky-600" />
                    UltraMsg Configuration (Instant QR Scan)
                  </div>
                  <a
                    href="https://ultramsg.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
                  >
                    Open UltraMsg ↗
                  </a>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="UltraMsg Instance ID"
                    placeholder="e.g. instance12345"
                    value={settings.ultraMsgInstanceId || ""}
                    onChange={(e) => setSettings({ ...settings, ultraMsgInstanceId: e.target.value })}
                  />
                  <Input
                    label="UltraMsg Token"
                    placeholder="e.g. abcd1234efgh..."
                    value={settings.ultraMsgToken || ""}
                    onChange={(e) => setSettings({ ...settings, ultraMsgToken: e.target.value })}
                  />
                </div>
              </div>
            )}

            {(settings.provider === "n8n" || settings.provider === "both") && (
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Server className="h-4 w-4 text-emerald-600" />
                  n8n Webhook Configuration
                </div>
                <Input
                  label="n8n Webhook URL"
                  placeholder="https://n8n.yourclinic.com/webhook/sri-saraswathi-dental-appointments"
                  value={settings.n8nWebhookUrl}
                  onChange={(e) => setSettings({ ...settings, n8nWebhookUrl: e.target.value })}
                  helperText="POST endpoint receiving event JSON when bookings or statuses change."
                />
                <Input
                  label="Webhook Authentication Secret (Optional)"
                  type="password"
                  placeholder="Secret token sent in x-webhook-token header"
                  value={settings.n8nAuthToken}
                  onChange={(e) => setSettings({ ...settings, n8nAuthToken: e.target.value })}
                />
              </div>
            )}

            {(settings.provider === "meta" || settings.provider === "both") && (
              <div className="rounded-xl border border-secondary-200 bg-secondary-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Key className="h-4 w-4 text-emerald-600" />
                  Meta WhatsApp Cloud API Credentials
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Meta Phone Number ID"
                    placeholder="e.g. 109283746592834"
                    value={settings.metaPhoneNumberId}
                    onChange={(e) => setSettings({ ...settings, metaPhoneNumberId: e.target.value })}
                  />
                  <Input
                    label="WhatsApp Business Account (WABA) ID"
                    placeholder="e.g. 192837465098234"
                    value={settings.metaWabaId}
                    onChange={(e) => setSettings({ ...settings, metaWabaId: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    label="Permanent System User Access Token"
                    type="password"
                    placeholder={settings.metaAccessTokenConfigured ? "Token configured (enter new to replace)" : "EAAG... Permanent access token"}
                    value={settings.metaAccessToken || ""}
                    onChange={(e) => setSettings({ ...settings, metaAccessToken: e.target.value })}
                    helperText={settings.metaAccessTokenConfigured ? `Current token active (${settings.metaAccessTokenPreview}). Stored securely on server.` : "Generated from Meta Business Settings > System Users."}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Template Customization Drawer */}
          <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft">
            <button
              type="button"
              onClick={() => setTemplatesExpanded(!templatesExpanded)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground hover:text-emerald-700"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Customize WhatsApp Message Templates &amp; Placeholders
              </span>
              {templatesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {templatesExpanded && (
              <div className="mt-4 space-y-4 border-t border-secondary-100 pt-4 text-xs">
                <p className="text-muted-foreground">
                  Variables available: <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{appointment_id}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{patient_name}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{patient_phone}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{treatment_name}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{appointment_date}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{appointment_time}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{doctor_name}"}</code>, <code className="bg-secondary-100 px-1 py-0.5 rounded">{"{rejection_reason}"}</code>.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">New Booking Notification (Sent to Clinic +919345743409)</label>
                    <textarea
                      rows={5}
                      className="w-full font-mono text-[11px] rounded-xl border border-secondary-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.templates.newBookingClinic}
                      onChange={(e) => setSettings({ ...settings, templates: { ...settings.templates, newBookingClinic: e.target.value } })}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Patient Confirmation Message</label>
                    <textarea
                      rows={5}
                      className="w-full font-mono text-[11px] rounded-xl border border-secondary-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.templates.patientConfirmed}
                      onChange={(e) => setSettings({ ...settings, templates: { ...settings.templates, patientConfirmed: e.target.value } })}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Patient Rejection / Cancellation Message</label>
                    <textarea
                      rows={5}
                      className="w-full font-mono text-[11px] rounded-xl border border-secondary-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.templates.patientRejected}
                      onChange={(e) => setSettings({ ...settings, templates: { ...settings.templates, patientRejected: e.target.value } })}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Patient Reschedule Message</label>
                    <textarea
                      rows={5}
                      className="w-full font-mono text-[11px] rounded-xl border border-secondary-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.templates.patientRescheduled}
                      onChange={(e) => setSettings({ ...settings, templates: { ...settings.templates, patientRescheduled: e.target.value } })}
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">24-Hour Patient Reminder Message</label>
                    <textarea
                      rows={5}
                      className="w-full font-mono text-[11px] rounded-xl border border-secondary-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.templates.patientReminder}
                      onChange={(e) => setSettings({ ...settings, templates: { ...settings.templates, patientReminder: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Event Toggles & Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Automated Event Toggles</h3>
            <p className="text-[11px] text-muted-foreground">Select which events trigger automated WhatsApp messages.</p>

            <div className="space-y-3">
              {[
                { key: "notifyNewBooking", label: "🔔 New Booking Alert", sub: "Sent to clinic (+919345743409)" },
                { key: "notifyConfirmed", label: "✅ Appointment Confirmed", sub: "Sent to patient" },
                { key: "notifyRejected", label: "❌ Appointment Rejection", sub: "Sent to patient" },
                { key: "notifyRescheduled", label: "🗓️ Appointment Rescheduled", sub: "Sent to patient" },
                { key: "notifyReminder", label: "⏰ 24h Prior Reminder", sub: "Sent to patient" },
                { key: "notifyCustomReply", label: "💬 Custom Admin Replies", sub: "Sent to patient" },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-secondary-100 p-2.5">
                  <div>
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={Boolean(settings[key as keyof WhatsAppSettings])}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Delivery Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-900 border border-emerald-100">
                <span className="block text-lg font-bold text-emerald-700">
                  {logs.filter((l) => l.status === "delivered").length}
                </span>
                Delivered
              </div>
              <div className="rounded-xl bg-sky-50 p-2.5 text-sky-900 border border-sky-100">
                <span className="block text-lg font-bold text-sky-700">
                  {logs.filter((l) => l.status === "simulated").length}
                </span>
                Simulated / Ready
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Total dispatches recorded: {logs.length}
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Delivery Audit History Table */}
      <div className="rounded-2xl border border-secondary-200 bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent WhatsApp Delivery History &amp; Audit Trail</h3>
            <p className="text-[11px] text-muted-foreground">Real-time log of automated notifications sent to clinic and patients.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-secondary-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary-50 border-b border-secondary-100 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3.5 py-2.5">Time</th>
                <th className="px-3.5 py-2.5">Event</th>
                <th className="px-3.5 py-2.5">Recipient</th>
                <th className="px-3.5 py-2.5">Patient / Ref</th>
                <th className="px-3.5 py-2.5">Provider</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {logs.slice(0, 25).map((log) => {
                const isDelivered = log.status === "delivered";
                const isSimulated = log.status === "simulated";
                const isFailed = log.status === "failed";
                return (
                  <tr key={log.id} className="hover:bg-secondary-50/50 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] font-medium text-foreground">
                      {log.event}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={log.recipientType === "clinic" ? "font-semibold text-emerald-800" : "text-foreground"}>
                        {log.recipient} {log.recipientType === "clinic" && "⭐ Clinic"}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {log.patientName} <span className="text-[10px] text-muted-foreground">({log.ref})</span>
                    </td>
                    <td className="px-3.5 py-2.5 uppercase font-medium text-[10px] text-secondary-600">
                      {log.provider}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {isDelivered && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Delivered
                        </span>
                      )}
                      {isSimulated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                          <Info className="h-3 w-3" /> Ready / Logged
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800" title={log.error || ""}>
                          <AlertTriangle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        <Eye className="h-3 w-3" /> View text
                      </button>
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No WhatsApp notifications logged yet. Click &quot;Send Test Notification&quot; to test your pipeline!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Notification Modal */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        size="md"
        title="Send Test WhatsApp Notification"
        description="Verify your WhatsApp automation pipeline with real-time feedback."
      >
        <div className="space-y-4">
          {!isLiveConfigured && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong className="block font-semibold">⚠️ Notice: Simulated Test Mode</strong>
              Because no active n8n Webhook URL or Meta Cloud API Token has been entered yet, this test will format the notification and log it to your audit trail, but will <em>not</em> send a physical WhatsApp message to your phone until credentials are saved.
            </div>
          )}

          <div>
            <Input
              label="Recipient Phone Number"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              helperText="Defaults to clinic number: 9345743409"
            />
          </div>

          <div>
            <Select
              label="Notification Event Type"
              value={testEvent}
              onChange={(e) => setTestEvent(e.target.value)}
              options={[
                { value: "booking.created", label: "🔔 New Booking Alert (Clinic Format)" },
                { value: "booking.confirmed", label: "✅ Booking Confirmed (Patient Format)" },
                { value: "booking.rejected", label: "❌ Booking Rejection (Patient Format)" },
                { value: "booking.rescheduled", label: "🗓️ Booking Rescheduled (Patient Format)" },
                { value: "booking.reminder", label: "⏰ 24h Reminder (Patient Format)" },
              ]}
            />
          </div>

          {Boolean(testResult) && (
            <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-3 text-xs space-y-1 font-mono">
              <p className="font-semibold text-foreground font-sans">Execution Diagnostic Output:</p>
              <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] text-foreground/80 max-h-48">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-secondary-100 pt-3">
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              loading={testing}
              onClick={() => void handleTest()}
            >
              <Send className="h-4 w-4" /> Dispatch Test Ping
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Log Text Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        size="md"
        title="WhatsApp Message Content"
        description={selectedLog ? `${selectedLog.event} → ${selectedLog.recipient}` : ""}
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 font-sans text-xs whitespace-pre-wrap text-emerald-950 leading-relaxed">
              {selectedLog.message}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Status: <strong className="uppercase">{selectedLog.status}</strong></span>
              <span>Logged: {new Date(selectedLog.created_at).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
