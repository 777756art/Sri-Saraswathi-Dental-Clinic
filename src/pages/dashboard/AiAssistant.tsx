import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import {
  Bot,
  Sparkles,
  Settings,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Send,
  Calendar,
  Phone,
  Eye,
  Sliders,
} from "lucide-react";
import {
  chatbotApi,
  type AdminChatbotSettings,
  type AdminChatbotFAQ,
  type AdminChatbotConversation,
  type ChatbotMessageItem,
} from "@/lib/api";

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<"settings" | "faqs" | "questions" | "conversations" | "live_test">("settings");
  
  // Settings State
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [chatbotName, setChatbotName] = useState("Dental Care Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [systemInstructions, setSystemInstructions] = useState("");
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [themeColor, setThemeColor] = useState("teal");
  const [placement, setPlacement] = useState("bottom-right");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; timestamp?: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Suggested Questions State
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState("");

  // FAQs State
  const [faqs, setFaqs] = useState<AdminChatbotFAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<AdminChatbotFAQ | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    category: "Treatments",
    displayOrder: 0,
    status: "active" as "active" | "inactive",
  });
  const [savingFaq, setSavingFaq] = useState(false);

  // Conversations State
  const [conversations, setConversations] = useState<AdminChatbotConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<{
    session: any;
    messages: ChatbotMessageItem[];
    appointment?: any;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Live Test State
  const [testMessages, setTestMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Hello! I am your AI Dental Care Assistant. How can I help your smile today?" },
  ]);
  const [testInput, setTestInput] = useState("");
  const [testSending, setTestSending] = useState(false);

  // 1. Load Settings
  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await chatbotApi.getAdminSettings();
      if (res.ok && res.settings) {
        setEnabled(res.settings.enabled);
        setChatbotName(res.settings.chatbotName || "Dental Care Assistant");
        setWelcomeMessage(res.settings.welcomeMessage || "");
        setSystemInstructions(res.settings.systemInstructions || "");
        setModelName(res.settings.modelName || "gpt-4o-mini");
        setSuggestedQuestions(res.settings.suggestedQuestions || []);
        if (res.settings.appearanceSettings) {
          setThemeColor(res.settings.appearanceSettings.theme || "teal");
          setPlacement(res.settings.appearanceSettings.placement || "bottom-right");
        }
      }
      if (res.environment) {
        setApiKeyConfigured(res.environment.openaiApiKeyConfigured);
      }
    } catch (err: any) {
      toast.error("Failed to load chatbot settings: " + (err?.message || "Error"));
    } finally {
      setLoadingSettings(false);
    }
  };

  // 2. Load FAQs
  const loadFaqs = async () => {
    setLoadingFaqs(true);
    try {
      const res = await chatbotApi.getFAQs();
      if (res.ok) {
        setFaqs(res.faqs || []);
      }
    } catch (err: any) {
      toast.error("Failed to load FAQs");
    } finally {
      setLoadingFaqs(false);
    }
  };

  // 3. Load Conversations
  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await chatbotApi.getConversations(50);
      if (res.ok) {
        setConversations(res.conversations || []);
      }
    } catch (err: any) {
      toast.error("Failed to load conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "faqs") loadFaqs();
    if (activeTab === "conversations") loadConversations();
  }, [activeTab]);

  // Handle Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await chatbotApi.updateAdminSettings({
        enabled,
        chatbotName,
        welcomeMessage,
        systemInstructions,
        modelName,
        suggestedQuestions,
        appearanceSettings: { theme: themeColor, placement },
      });
      toast.success("AI Chatbot settings saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save settings: " + (err?.message || "Error"));
    } finally {
      setSavingSettings(false);
    }
  };

  // Test OpenAI API Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await chatbotApi.testOpenAIConnection(modelName);
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Connection successful! Model "${res.model}" replied: "${res.reply}"`,
          timestamp: new Date().toLocaleTimeString(),
        });
        toast.success("OpenAI API test succeeded!");
      } else {
        setTestResult({
          ok: false,
          message: res.error || "OpenAI API connection failed. Please check server OPENAI_API_KEY.",
          timestamp: new Date().toLocaleTimeString(),
        });
        toast.error(res.error || "OpenAI test failed");
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || "Unexpected network error testing connection.",
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error("OpenAI test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  // Add / Delete Suggested Question
  const handleAddQuestion = () => {
    const q = newQuestionInput.trim();
    if (!q) return;
    if (suggestedQuestions.includes(q)) {
      toast.error("This question already exists");
      return;
    }
    setSuggestedQuestions([...suggestedQuestions, q]);
    setNewQuestionInput("");
  };

  const handleDeleteQuestion = (index: number) => {
    setSuggestedQuestions(suggestedQuestions.filter((_, i) => i !== index));
  };

  // FAQ Modal Handlers
  const handleOpenFaqModal = (faq?: AdminChatbotFAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({
        question: faq.question,
        answer: faq.answer,
        category: faq.category || "Treatments",
        displayOrder: faq.display_order || 0,
        status: faq.status || "active",
      });
    } else {
      setEditingFaq(null);
      setFaqForm({
        question: "",
        answer: "",
        category: "Treatments",
        displayOrder: faqs.length + 1,
        status: "active",
      });
    }
    setFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSavingFaq(true);
    try {
      if (editingFaq) {
        await chatbotApi.updateFAQ(editingFaq.id, faqForm);
        toast.success("FAQ updated successfully");
      } else {
        await chatbotApi.createFAQ(faqForm);
        toast.success("FAQ created successfully");
      }
      setFaqModalOpen(false);
      loadFaqs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save FAQ");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await chatbotApi.deleteFAQ(id);
      toast.success("FAQ deleted");
      setFaqs(faqs.filter((f) => f.id !== id));
    } catch (err: any) {
      toast.error("Failed to delete FAQ");
    }
  };

  // View Conversation Details
  const handleViewConversation = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingDetail(true);
    try {
      const res = await chatbotApi.getConversationDetails(sessionId);
      if (res.ok) {
        setSessionDetail(res);
      }
    } catch (err: any) {
      toast.error("Failed to load conversation details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteConversation = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this conversation transcript?")) return;
    try {
      await chatbotApi.deleteConversation(sessionId);
      toast.success("Conversation deleted");
      setConversations(conversations.filter((c) => c.session_id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setSessionDetail(null);
      }
    } catch (err: any) {
      toast.error("Failed to delete conversation");
    }
  };

  // Live Test Handler
  const handleSendLiveTest = async () => {
    const text = testInput.trim();
    if (!text || testSending) return;
    setTestMessages((prev) => [...prev, { role: "user", text }]);
    setTestInput("");
    setTestSending(true);

    try {
      const res = await chatbotApi.sendMessage({
        message: text,
        sessionId: "admin_test_session",
      });
      setTestMessages((prev) => [...prev, { role: "assistant", text: res.reply }]);
    } catch (err: any) {
      setTestMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Error: " + (err?.message || "Could not reach chatbot service.") },
      ]);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" /> AI &amp; Patient Communication
          </span>
          <h1 className="mt-2 text-display-3 text-[#1F6878]">AI Dental Assistant Management</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Configure the official OpenAI-powered assistant, manage clinic knowledge, suggested questions, and inspect patient conversation transcripts.
          </p>
        </div>

        {/* Global Chatbot Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-white px-3.5 py-2 shadow-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-[#19B987] animate-pulse" : "bg-zinc-400"}`} />
            <span className="text-[12px] font-bold text-[#1F6878]">
              {enabled ? "Assistant Active" : "Assistant Disabled"}
            </span>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="h-10 bg-[#E95A35] hover:bg-[#D14824] text-white"
          >
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-border/80 pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
            activeTab === "settings"
              ? "bg-[#1F6878] text-white shadow-xs"
              : "text-[#707574] hover:bg-zinc-100 hover:text-[#1F6878]"
          }`}
        >
          <Settings className="h-4 w-4" /> Settings &amp; AI Engine
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
            activeTab === "faqs"
              ? "bg-[#1F6878] text-white shadow-xs"
              : "text-[#707574] hover:bg-zinc-100 hover:text-[#1F6878]"
          }`}
        >
          <HelpCircle className="h-4 w-4" /> Clinic FAQs Knowledge
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
            activeTab === "questions"
              ? "bg-[#1F6878] text-white shadow-xs"
              : "text-[#707574] hover:bg-zinc-100 hover:text-[#1F6878]"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Suggested Questions
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conversations")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
            activeTab === "conversations"
              ? "bg-[#1F6878] text-white shadow-xs"
              : "text-[#707574] hover:bg-zinc-100 hover:text-[#1F6878]"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Patient Conversations ({conversations.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("live_test")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition ${
            activeTab === "live_test"
              ? "bg-[#1F6878] text-white shadow-xs"
              : "text-[#707574] hover:bg-zinc-100 hover:text-[#1F6878]"
          }`}
        >
          <Bot className="h-4 w-4" /> Live Assistant Test
        </button>
      </div>

      {/* ------------------------------------------------------------- TAB 1: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* OpenAI API Engine Status Card */}
          <Card className="p-5 sm:p-6 border-[#1F6878]/20 bg-gradient-to-br from-white to-[#F5F2EB]/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#E4F0F2] text-[#1F6878] shadow-xs">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-sans text-[16px] font-bold text-[#1F6878]">
                    Official OpenAI Integration Status
                  </h3>
                  <p className="text-[12.5px] text-[#707574]">
                    Powered by official OpenAI API with dynamic database grounding and medical safety checks.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant={apiKeyConfigured ? "success" : "warning"}
                  className={apiKeyConfigured ? "bg-[#19B987] text-white" : "bg-amber-100 text-amber-900 border-amber-300"}
                >
                  {apiKeyConfigured ? "OPENAI_API_KEY Configured" : "OPENAI_API_KEY Missing on Server"}
                </Badge>

                <Button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  variant="outline"
                  className="h-9 gap-1.5 border-[#1F6878]/30 text-[#1F6878] hover:bg-[#E4F0F2]"
                >
                  {testingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Test OpenAI Connection
                </Button>
              </div>
            </div>

            {testResult && (
              <div
                className={`mt-4 rounded-xl p-3.5 text-[12.5px] border ${
                  testResult.ok
                    ? "border-[#19B987]/30 bg-[#19B987]/10 text-emerald-950"
                    : "border-red-300 bg-red-50 text-red-950"
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-[#19B987] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    <p className="text-[11px] opacity-75 mt-0.5">Tested at {testResult.timestamp}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Assistant Identity & Behavior Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 sm:p-6 space-y-4">
              <h3 className="font-sans text-[15px] font-bold text-[#1F6878] flex items-center gap-2">
                <Sliders className="h-4 w-4" /> Assistant Identity &amp; Status
              </h3>

              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-zinc-50/60 p-3.5">
                <div>
                  <label htmlFor="assistant-toggle-input" className="text-[13px] font-bold text-[#1F6878] block">Public Chatbot Status</label>
                  <p className="text-[11.5px] text-muted-foreground">
                    When enabled, the floating assistant appears on all public website pages.
                  </p>
                </div>
                <input
                  id="assistant-toggle-input"
                  type="checkbox"
                  aria-label="Public Chatbot Status"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-zinc-300 text-[#1F6878] focus:ring-[#1F6878]"
                />
              </div>

              {/* Chatbot Name */}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1.5">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder="e.g. Dental Care Assistant"
                  className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13.5px] text-[#15191B] focus:border-[#1F6878] focus:outline-none"
                />
              </div>

              {/* OpenAI Model Selection */}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1.5">
                  OpenAI GPT Model
                </label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13.5px] text-[#15191B] focus:border-[#1F6878] focus:outline-none bg-white"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recommended · Fast, Intelligent, Cost-Effective)</option>
                  <option value="gpt-4o">gpt-4o (High Intelligence &amp; Multi-turn Reasoning)</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy Standard)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  The model can also be configured via server environment variable <code>OPENAI_MODEL</code>.
                </p>
              </div>

              {/* Welcome Message */}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1.5">
                  Welcome Greeting Message
                </label>
                <textarea
                  rows={4}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Initial message shown when opening chat..."
                  className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13px] text-[#15191B] focus:border-[#1F6878] focus:outline-none leading-relaxed"
                />
              </div>
            </Card>

            {/* Custom System Prompt & Medical Safety */}
            <Card className="p-5 sm:p-6 space-y-4">
              <h3 className="font-sans text-[15px] font-bold text-[#1F6878] flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> AI Instructions &amp; Safety Guidelines
              </h3>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1.5">
                  Custom Clinic Instructions &amp; Policies
                </label>
                <textarea
                  rows={6}
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  placeholder="Optional custom clinic guidelines, tone instructions, or special policies..."
                  className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13px] text-[#15191B] focus:border-[#1F6878] focus:outline-none leading-relaxed font-mono text-[12px]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Built-in safety rules strictly prevent prescribing medicines, drug dosages, or diagnosing conditions chairside.
                </p>
              </div>

              {/* Built-in Knowledge Base Sources */}
              <div className="rounded-xl border border-[#1F6878]/20 bg-[#E4F0F2]/50 p-3.5 text-[12px] space-y-1.5 text-[#073B43]">
                <p className="font-bold flex items-center gap-1.5 text-[#1F6878]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#19B987]" /> Active Database Knowledge Sources:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[#073B43]/85 text-[11.5px]">
                  <li>Clinic Profile (Name, Address, Timings, Phone: 0424 427 2494)</li>
                  <li>Active Doctors (Dr. Kishore Kumar, BDS, MDS, Specializations)</li>
                  <li>Active Published Treatments (Benefits, descriptions, duration)</li>
                  <li>Live Calendar Availability &amp; Conflict Prevention System</li>
                  <li>Admin-managed Clinic FAQs</li>
                </ul>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full h-10 bg-[#1F6878] hover:bg-[#185360] text-white"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Update Assistant Settings
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- TAB 2: FAQS KNOWLEDGE */}
      {activeTab === "faqs" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-sans text-[18px] font-bold text-[#1F6878]">Clinic FAQ Knowledge Base</h2>
              <p className="text-[12.5px] text-muted-foreground">
                Verified answers that the AI Dental Assistant prioritizes when answering patient questions.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => handleOpenFaqModal()}
              className="h-9 gap-1.5 bg-[#1F6878] hover:bg-[#185360] text-white"
            >
              <Plus className="h-4 w-4" /> Add FAQ
            </Button>
          </div>

          {loadingFaqs ? (
            <div className="grid h-48 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#1F6878]" />
            </div>
          ) : faqs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <HelpCircle className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
              <p>No custom FAQs added yet. Click &quot;Add FAQ&quot; to provide verified clinic answers.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => (
                <Card key={faq.id} className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="rounded-full bg-[#E4F0F2] px-2.5 py-0.5 text-[10px] font-bold text-[#1F6878]">
                        {faq.category || "General"}
                      </span>
                      <Badge
                        variant={faq.status === "active" ? "success" : "default"}
                        className={faq.status === "active" ? "bg-[#19B987] text-white text-[10px]" : "text-[10px]"}
                      >
                        {faq.status}
                      </Badge>
                    </div>
                    <h4 className="font-sans text-[14px] font-bold text-[#1F6878]">
                      {faq.question}
                    </h4>
                    <p className="mt-2 text-[12.5px] text-[#707574] leading-relaxed whitespace-pre-wrap">
                      {faq.answer}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFaqModal(faq)}
                      className="h-8 text-[11.5px]"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="h-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- TAB 3: SUGGESTED QUESTIONS */}
      {activeTab === "questions" && (
        <Card className="p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-sans text-[18px] font-bold text-[#1F6878]">
              Manage Suggested Quick Questions
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              These clickable question chips appear right above the chat input to help patients quickly explore clinic offerings.
            </p>
          </div>

          {/* Add New Question Row */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <input
              type="text"
              value={newQuestionInput}
              onChange={(e) => setNewQuestionInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddQuestion())}
              placeholder="e.g. How much does teeth cleaning cost?"
              className="flex-1 rounded-xl border border-border/80 px-3.5 py-2 text-[13.5px] text-[#15191B] focus:border-[#1F6878] focus:outline-none"
            />
            <Button
              type="button"
              onClick={handleAddQuestion}
              className="h-10 bg-[#1F6878] hover:bg-[#185360] text-white gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>

          {/* List of Questions */}
          <div className="space-y-2">
            {suggestedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-zinc-50/70 px-4 py-2.5 text-[13px] text-[#15191B]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1F6878]/10 text-[10px] font-bold text-[#1F6878]">
                    {idx + 1}
                  </span>
                  <span>{q}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(idx)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-600 transition"
                  title="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/60">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="h-10 bg-[#E95A35] hover:bg-[#D14824] text-white"
            >
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Suggested Questions
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------- TAB 4: CONVERSATIONS */}
      {activeTab === "conversations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Conversation List Column */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-sans text-[16px] font-bold text-[#1F6878]">Chat Transcripts</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadConversations}
                disabled={loadingConversations}
                className="h-8 gap-1 text-[12px]"
              >
                <RefreshCw className={`h-3 w-3 ${loadingConversations ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {loadingConversations ? (
              <div className="grid h-48 place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#1F6878]" />
              </div>
            ) : conversations.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-zinc-300" />
                <p className="text-[13px]">No patient conversations recorded yet.</p>
              </Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleViewConversation(c.session_id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selectedSessionId === c.session_id
                        ? "border-[#1F6878] bg-[#E4F0F2]/50 shadow-xs"
                        : "border-border/80 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-sans text-[13px] font-bold text-[#1F6878] truncate">
                        {c.patient_name ? c.patient_name : "Website Guest"}
                      </span>
                      {c.appointment_id ? (
                        <span className="rounded-full bg-[#19B987]/15 px-2 py-0.5 text-[9.5px] font-bold text-[#0E8A5E]">
                          Booked Apt #{c.appointment_id}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[11.5px] text-[#707574] line-clamp-1">
                      {c.latest_message || "Active chat session"}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10.5px] text-zinc-400">
                      <span>{c.message_count} messages</span>
                      <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conversation Detail Column */}
          <div className="lg:col-span-7">
            {loadingDetail ? (
              <Card className="grid h-[400px] place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#1F6878]" />
              </Card>
            ) : sessionDetail ? (
              <Card className="p-5 flex flex-col h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                  <div>
                    <h3 className="font-sans text-[15px] font-bold text-[#1F6878]">
                      {sessionDetail.session.patient_name || "Website Guest"}
                    </h3>
                    <p className="text-[11.5px] text-muted-foreground">
                      Session: <code>{sessionDetail.session.session_id}</code>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteConversation(sessionDetail.session.session_id)}
                    className="h-8 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Messages scroll */}
                <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-zinc-50/70 rounded-xl mb-3">
                  {sessionDetail.messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                          m.role === "user"
                            ? "bg-[#1F6878] text-white rounded-tr-xs"
                            : "bg-white border border-border/80 text-[#15191B] rounded-tl-xs shadow-xs"
                        }`}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-70">
                          {m.role === "user" ? "PATIENT" : "DENTAL ASSISTANT"}
                        </p>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Appointment Footer if generated */}
                {sessionDetail.appointment && (
                  <div className="rounded-xl border border-[#19B987]/30 bg-[#19B987]/10 p-3 text-[12px] text-emerald-950 flex items-center justify-between">
                    <div>
                      <p className="font-bold">
                        Appointment Confirmed: #{sessionDetail.appointment.id}
                      </p>
                      <p className="text-[11px] opacity-80">
                        {sessionDetail.appointment.appointment_date} at {sessionDetail.appointment.appointment_time}
                      </p>
                    </div>
                    <Badge className="bg-[#19B987] text-white">
                      {sessionDetail.appointment.status}
                    </Badge>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="grid h-[400px] place-items-center text-center p-6 text-muted-foreground">
                <div>
                  <Eye className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                  <p>Select any conversation on the left to read the full dialogue transcript.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- TAB 5: LIVE ASSISTANT TEST */}
      {activeTab === "live_test" && (
        <Card className="p-5 sm:p-6 max-w-2xl mx-auto space-y-4">
          <div>
            <h2 className="font-sans text-[18px] font-bold text-[#1F6878] flex items-center gap-2">
              <Bot className="h-5 w-5" /> Live Assistant Simulation
            </h2>
            <p className="text-[12.5px] text-muted-foreground">
              Test how the AI assistant answers patient questions, checks booking availability, and adheres to medical safety rules in real time.
            </p>
          </div>

          {/* Test Messages Container */}
          <div className="h-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0B2024] p-4 space-y-3">
            {testMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#154650] text-white rounded-tr-xs"
                      : "bg-[#0C2B32] border border-white/15 text-white/95 rounded-tl-xs"
                  }`}
                >
                  <p className="text-[9.5px] font-bold uppercase tracking-wider mb-1 text-[#99E3EC]">
                    {m.role === "user" ? "PATIENT (TEST)" : "DENTAL ASSISTANT"}
                  </p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}
            {testSending && (
              <div className="flex items-center gap-2 text-[12px] text-[#99E3EC]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Assistant is thinking...</span>
              </div>
            )}
          </div>

          {/* Test Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendLiveTest();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={testInput}
              disabled={testSending}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Ask a question (e.g. I have tooth pain, what should I do?)..."
              className="flex-1 rounded-xl border border-border/80 px-4 py-2.5 text-[13.5px] text-[#15191B] focus:border-[#1F6878] focus:outline-none"
            />
            <Button
              type="submit"
              disabled={!testInput.trim() || testSending}
              className="h-10 bg-[#1F6878] hover:bg-[#185360] text-white gap-1.5"
            >
              <Send className="h-4 w-4" /> Send
            </Button>
          </form>
        </Card>
      )}

      {/* ------------------------------------------------------------- FAQ MODAL */}
      <Modal
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        title={editingFaq ? "Edit Clinic FAQ" : "Add New Clinic FAQ"}
      >
        <form onSubmit={handleSaveFaq} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1">
              Question
            </label>
            <input
              type="text"
              required
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              placeholder="e.g. What is a dental implant?"
              className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13.5px] text-[#15191B] focus:border-[#1F6878] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1">
              Answer
            </label>
            <textarea
              required
              rows={4}
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              placeholder="Provide a clear, accurate clinic answer..."
              className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13px] text-[#15191B] focus:border-[#1F6878] focus:outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1">
                Category
              </label>
              <select
                value={faqForm.category}
                onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13px] text-[#15191B] focus:border-[#1F6878] focus:outline-none bg-white"
              >
                <option value="Treatments">Treatments</option>
                <option value="Appointments">Appointments</option>
                <option value="Clinic Info">Clinic Info</option>
                <option value="Emergency &amp; Symptoms">Emergency &amp; Symptoms</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-[#707574] mb-1">
                Status
              </label>
              <select
                value={faqForm.status}
                onChange={(e) => setFaqForm({ ...faqForm, status: e.target.value as "active" | "inactive" })}
                className="w-full rounded-xl border border-border/80 px-3.5 py-2 text-[13px] text-[#15191B] focus:border-[#1F6878] focus:outline-none bg-white"
              >
                <option value="active">Active (Taught to AI)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setFaqModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingFaq} className="bg-[#1F6878] hover:bg-[#185360] text-white">
              {savingFaq ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingFaq ? "Save Changes" : "Create FAQ"}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
