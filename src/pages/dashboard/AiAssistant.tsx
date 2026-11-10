import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";
import { Bot, FileText, Image as ImageIcon, Bell, Mic, Send, Sparkles, AlertTriangle, Loader2 } from "lucide-react";

const quickQuestions = [
  "How much does a root canal usually cost?",
  "Is my tooth pain an emergency?",
  "How should I prepare for my appointment?",
  "What are the signs of gum disease?",
  "How often should I get dental X-rays?",
];

const aiFeatures = [
  { id: "assistant", label: "AI Assistant", icon: Bot, desc: "Answer patient questions and provide guidance" },
  { id: "triage", label: "Appointment Triage", icon: AlertTriangle, desc: "Collect symptoms and route urgent cases" },
  { id: "documentation", label: "Clinical Documentation", icon: FileText, desc: "Auto-draft consultation and progress notes" },
  { id: "imaging", label: "Imaging Assistance", icon: ImageIcon, desc: "Highlight findings in X-rays and scans" },
  { id: "followup", label: "Follow-up Automation", icon: Bell, desc: "Personalized reminders for patients" },
  { id: "voice", label: "Voice Assistant", icon: Mic, desc: "Dictate clinical notes and prescriptions" },
];

export default function AIAssistantPage() {
  const [activeFeature, setActiveFeature] = useState("assistant");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [triageSymptom, setTriageSymptom] = useState("");
  const [triageSeverity, setTriageSeverity] = useState("");
  const [triageResult, setTriageResult] = useState<{ priority: "High" | "Medium" | "Low"; text: string } | null>(null);
  const [docType, setDocType] = useState("consultation");
  const [notes, setNotes] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);

  const active = aiFeatures.find((f) => f.id === activeFeature) ?? aiFeatures[0];

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsLoading(true);
    // Simulate AI response
    setTimeout(() => {
      setResponse(
        `Based on your question about "${question}", here's what I can tell you:\n\n` +
        `This is a general guidance response. For specific medical advice, please consult with your dentist. ` +
        `Would you like to book an appointment for a professional evaluation?\n\n` +
        `I recommend scheduling a consultation to get a personalized assessment of your dental health needs. ` +
        `Our AI-powered diagnostic tools can provide detailed analysis during your visit.`
      );
      setIsLoading(false);
    }, 1500);
  };

  const handleTriage = () => {
    if (!triageSymptom || !triageSeverity) {
      toast.error("Select a symptom and pain severity first");
      return;
    }
    const severity = Number(triageSeverity);
    const urgent = ["trauma", "infection", "swelling"].includes(triageSymptom);
    const priority: "High" | "Medium" | "Low" = severity >= 7 || urgent ? "High" : severity >= 4 ? "Medium" : "Low";
    const text =
      priority === "High"
        ? "Based on the reported symptoms, this case appears urgent. Recommend a same-day appointment within 4 hours."
        : priority === "Medium"
          ? "Schedule a priority appointment within 24 hours and monitor for worsening symptoms."
          : "Routine care is appropriate. Offer the next available appointment within the week.";
    setTriageResult({ priority, text });
    toast.success(`Triage complete — ${priority.toLowerCase()} priority`);
  };

  const docLabels: Record<string, string> = {
    consultation: "Consultation note",
    progress: "Progress note",
    referral: "Referral letter",
    followup: "Follow-up summary",
    prescription: "Prescription",
  };

  const handleGenerateDoc = () => {
    if (!notes.trim()) {
      toast.error("Add clinical notes before generating");
      return;
    }
    setGeneratedDoc(
      `${docLabels[docType]} — Sri Saraswathi Dental Clinic\n\nPatient: [from chart]\nDate: ${new Date().toLocaleDateString("en-IN")}\n\nAssessment:\n${notes.trim()}\n\nPlan:\n• Review in 2 weeks\n• Continue prescribed oral care\n• Contact clinic if symptoms worsen`,
    );
    toast.success("Structured document generated");
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <span className="eyebrow"><span className="eyebrow-dot" /> Clinic workspace</span>
        <h1 className="mt-3 text-display-3 text-foreground">AI Assistant</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          AI-powered tools for dental diagnosis, documentation, and patient communication.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {aiFeatures.map((feature) => {
          const isActive = activeFeature === feature.id;
          return (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              aria-pressed={isActive}
              className={`rounded-2xl border p-4 text-left transition-all ${
                isActive
                  ? "border-primary-300 bg-primary-50/70 shadow-soft"
                  : "border-border/70 bg-card hover:border-primary-200 hover:shadow-soft"
              }`}
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  isActive ? "bg-primary-600 text-primary-foreground" : "bg-primary-50 text-primary-700"
                }`}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">{feature.label}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{feature.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Chat */}
        <Card className="lg:row-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
              <Bot className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">AI Dental Assistant</h2>
              <p className="text-xs text-muted-foreground">Powered by advanced LLM</p>
            </div>
            <Badge variant="success" className="ml-auto">Online</Badge>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => { setQuestion(q); setResponse(null); }}
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mb-4 min-h-[168px] rounded-2xl border border-border/60 bg-secondary-50/40 p-4">
            {response ? (
              <div className="animate-fade-in">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-600" />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">AI response</span>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/75">{response}</p>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/dashboard/appointments">Book appointment</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success("Thanks — feedback recorded")}>Helpful</Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[136px] flex-col items-center justify-center text-center">
                <Sparkles className="mb-2 h-6 w-6 text-primary-300" />
                <p className="text-sm text-muted-foreground">Pick a suggested question or ask your own to get started.</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask the AI dental assistant anything..."
              aria-label="Ask the AI dental assistant"
              className="h-11 flex-1 rounded-full border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
            />
            <Button onClick={handleAsk} loading={isLoading} className="h-11 w-11 rounded-full p-0" aria-label="Send question">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            AI provides general guidance only. Always consult with a licensed dentist for medical advice.
          </p>
        </Card>

        {/* Triage Tool */}
        {activeFeature === "triage" && (
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
              <AlertTriangle className="h-5 w-5 text-primary-600" /> Appointment Triage
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">Capture symptoms and flag urgent cases for same-day care.</p>
            <div className="space-y-4">
              <Select
                label="Symptom"
                value={triageSymptom}
                onChange={(e) => { setTriageSymptom(e.target.value); setTriageResult(null); }}
                placeholder="Select symptom"
                options={[
                  { value: "tooth-pain", label: "Tooth pain" },
                  { value: "swelling", label: "Swelling" },
                  { value: "bleeding", label: "Bleeding" },
                  { value: "trauma", label: "Injury / trauma" },
                  { value: "infection", label: "Infection" },
                ]}
              />
              <Select
                label="Pain severity"
                value={triageSeverity}
                onChange={(e) => { setTriageSeverity(e.target.value); setTriageResult(null); }}
                placeholder="Select severity"
                options={Array.from({ length: 10 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1} — ${i < 3 ? "Mild" : i < 7 ? "Moderate" : "Severe"}`,
                }))}
              />
              <Button fullWidth onClick={handleTriage}><Sparkles className="h-4 w-4" /> Run AI Triage</Button>
              {triageResult ? (
                <div
                  className={`rounded-xl border p-4 ${
                    triageResult.priority === "High"
                      ? "border-destructive/20 bg-destructive/5"
                      : triageResult.priority === "Medium"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        triageResult.priority === "High"
                          ? "text-destructive"
                          : triageResult.priority === "Medium"
                            ? "text-amber-700"
                            : "text-emerald-700"
                      }`}
                    >
                      AI assessment
                    </p>
                    <Badge variant={triageResult.priority === "High" ? "danger" : triageResult.priority === "Medium" ? "warning" : "success"}>
                      Priority: {triageResult.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/75">{triageResult.text}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-[12.5px] text-muted-foreground">
                  Select a symptom and severity, then run triage to see the priority.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Documentation */}
        {activeFeature === "documentation" && (
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
              <FileText className="h-5 w-5 text-primary-600" /> Clinical Documentation
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">Turn rough notes into structured, chart-ready records.</p>
            <div className="space-y-4">
              <Select
                label="Document type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                options={[
                  { value: "consultation", label: "Consultation notes" },
                  { value: "progress", label: "Progress notes" },
                  { value: "referral", label: "Referral letter" },
                  { value: "followup", label: "Follow-up summary" },
                  { value: "prescription", label: "Prescription" },
                ]}
              />
              <div>
                <label htmlFor="clinical-notes" className="mb-1.5 block text-sm font-medium text-foreground/75">Clinical notes</label>
                <textarea
                  id="clinical-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter clinical notes or voice transcription..."
                  className="min-h-[120px] w-full rounded-xl border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                />
              </div>
              <Button fullWidth onClick={handleGenerateDoc}><Sparkles className="h-4 w-4" /> Generate structured document</Button>
              {generatedDoc && (
                <div className="rounded-xl border border-border/70 bg-secondary-50/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-700">Generated preview</p>
                    <Badge variant="success">Ready</Badge>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-foreground/80">{generatedDoc}</pre>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Other feature placeholders */}
        {activeFeature !== "assistant" && activeFeature !== "triage" && activeFeature !== "documentation" && (
          <Card>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <active.icon className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{active.label}</h3>
              <p className="mb-4 max-w-sm text-sm text-muted-foreground">{active.desc}</p>
              <Badge variant="info">Coming soon</Badge>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
