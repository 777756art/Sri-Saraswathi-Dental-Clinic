"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  HeartHandshake,
  Image as ImageIcon,
  Layers,
  Loader2,
  MousePointerClick,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { api, resolveApiAsset, type SiteContent } from "@/lib/api";
import {
  DEFAULT_DOCTOR_DATA,
  parseDoctorData,
  serializeDoctorData,
  type DoctorSectionData,
} from "@/lib/doctor-section-config";

export default function StaffPage() {
  const [existingItem, setExistingItem] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmRemoveModal, setConfirmRemoveModal] = useState(false);

  // 1. Doctor Information
  const [name, setName] = useState(DEFAULT_DOCTOR_DATA.name);
  const [qualification, setQualification] = useState(DEFAULT_DOCTOR_DATA.qualification);
  const [designation, setDesignation] = useState(DEFAULT_DOCTOR_DATA.designation);
  const [description, setDescription] = useState(DEFAULT_DOCTOR_DATA.description);

  // 2. Doctor Profile Image
  const [image, setImage] = useState(DEFAULT_DOCTOR_DATA.image);

  // 3. Experience & Highlights
  const [experience, setExperience] = useState(DEFAULT_DOCTOR_DATA.experience);
  const [experienceTitle, setExperienceTitle] = useState(DEFAULT_DOCTOR_DATA.experienceTitle);
  const [experienceDesc, setExperienceDesc] = useState(DEFAULT_DOCTOR_DATA.experienceDesc);
  const [patientFirstTitle, setPatientFirstTitle] = useState(DEFAULT_DOCTOR_DATA.patientFirstTitle);
  const [patientFirstDesc, setPatientFirstDesc] = useState(DEFAULT_DOCTOR_DATA.patientFirstDesc);
  const [advancedTreatmentTitle, setAdvancedTreatmentTitle] = useState(
    DEFAULT_DOCTOR_DATA.advancedTreatmentTitle
  );
  const [advancedTreatmentDesc, setAdvancedTreatmentDesc] = useState(
    DEFAULT_DOCTOR_DATA.advancedTreatmentDesc
  );

  // 4. Key Features
  const [keyFeatures, setKeyFeatures] = useState<string[]>(DEFAULT_DOCTOR_DATA.keyFeatures);

  // 5. CTA Buttons
  const [primaryBtnText, setPrimaryBtnText] = useState(DEFAULT_DOCTOR_DATA.primaryBtnText);
  const [primaryBtnLink, setPrimaryBtnLink] = useState(DEFAULT_DOCTOR_DATA.primaryBtnLink);
  const [secondaryBtnText, setSecondaryBtnText] = useState(DEFAULT_DOCTOR_DATA.secondaryBtnText);
  const [secondaryBtnLink, setSecondaryBtnLink] = useState(DEFAULT_DOCTOR_DATA.secondaryBtnLink);

  // Badge / Verification
  const [badgeText, setBadgeText] = useState(DEFAULT_DOCTOR_DATA.badgeText || "Dedicated Clinical Leadership");
  const [verifiedText, setVerifiedText] = useState(DEFAULT_DOCTOR_DATA.verifiedText || "Tamil Nadu Dental Council");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Load existing doctor profile on mount
  const loadDoctorProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: SiteContent[] }>("/api/admin/content?type=doctor");
      const items = Array.isArray(data.items) ? data.items : [];
      // Prioritize homepage highlighted doctor or first doctor
      const doctorItem = items.find((item) => item.homepageHighlight) || items[0] || null;

      if (doctorItem) {
        setExistingItem(doctorItem);
        const parsed = parseDoctorData(doctorItem);
        setName(parsed.name);
        setQualification(parsed.qualification);
        setDesignation(parsed.designation);
        setDescription(parsed.description);
        setImage(parsed.image);
        setExperience(parsed.experience);
        setExperienceTitle(parsed.experienceTitle);
        setExperienceDesc(parsed.experienceDesc);
        setPatientFirstTitle(parsed.patientFirstTitle);
        setPatientFirstDesc(parsed.patientFirstDesc);
        setAdvancedTreatmentTitle(parsed.advancedTreatmentTitle);
        setAdvancedTreatmentDesc(parsed.advancedTreatmentDesc);
        setKeyFeatures(parsed.keyFeatures);
        setPrimaryBtnText(parsed.primaryBtnText);
        setPrimaryBtnLink(parsed.primaryBtnLink);
        setSecondaryBtnText(parsed.secondaryBtnText);
        setSecondaryBtnLink(parsed.secondaryBtnLink);
        if (parsed.badgeText) setBadgeText(parsed.badgeText);
        if (parsed.verifiedText) setVerifiedText(parsed.verifiedText);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load doctor profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDoctorProfile();
  }, [loadDoctorProfile]);

  // Handle uploading doctor profile image
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploaded = await api.upload(file, "doctors");
      setImage(uploaded.url);
      setIsDirty(true);
      toast.success("Doctor portrait uploaded successfully to Cloudflare R2!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove image action with confirmation
  const handleConfirmRemoveImage = () => {
    setImage("");
    setIsDirty(true);
    setConfirmRemoveModal(false);
    toast.success("Doctor profile image removed.");
  };

  // Dynamic Key Features helpers
  const handleFeatureChange = (index: number, val: string) => {
    const updated = [...keyFeatures];
    updated[index] = val;
    setKeyFeatures(updated);
    setIsDirty(true);
  };

  const handleAddFeature = () => {
    if (keyFeatures.length >= 6) {
      toast.error("You can add up to 6 key features.");
      return;
    }
    setKeyFeatures([...keyFeatures, "New Dental Care Benefit"]);
    setIsDirty(true);
  };

  const handleRemoveFeature = (index: number) => {
    if (keyFeatures.length <= 1) {
      toast.error("At least one key feature is required.");
      return;
    }
    setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  // Save changes to backend database
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving || uploadingImage) return;

    if (!name.trim()) {
      toast.error("Doctor Name is required.");
      return;
    }
    if (!qualification.trim()) {
      toast.error("Qualification is required.");
      return;
    }
    if (!designation.trim()) {
      toast.error("Designation is required.");
      return;
    }
    if (!image.trim()) {
      toast.error("Doctor Profile Image is required.");
      return;
    }
    if (!primaryBtnText.trim() || !primaryBtnLink.trim()) {
      toast.error("Primary CTA Button text and link are required.");
      return;
    }
    if (!secondaryBtnText.trim() || !secondaryBtnLink.trim()) {
      toast.error("Secondary CTA Button text and link are required.");
      return;
    }

    setSaving(true);
    try {
      const doctorData: DoctorSectionData = {
        name,
        qualification,
        designation,
        description,
        image,
        experience,
        experienceTitle,
        experienceDesc,
        patientFirstTitle,
        patientFirstDesc,
        advancedTreatmentTitle,
        advancedTreatmentDesc,
        keyFeatures: keyFeatures.map((f) => f.trim()).filter(Boolean),
        primaryBtnText,
        primaryBtnLink,
        secondaryBtnText,
        secondaryBtnLink,
        badgeText,
        verifiedText,
      };

      const payload = serializeDoctorData(doctorData);

      if (existingItem?.id) {
        const res = await api.patch<{ item: SiteContent }>(
          `/api/admin/content/${existingItem.id}`,
          payload
        );
        setExistingItem(res.item);
      } else {
        const res = await api.post<{ item: SiteContent }>("/api/admin/content", payload);
        setExistingItem(res.item);
      }

      setIsDirty(false);
      toast.success("Doctor Section saved & published to homepage!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save doctor section.");
    } finally {
      setSaving(false);
    }
  };

  const scrollToPreview = () => {
    previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const previewImageUrl = image ? resolveApiAsset(image) : DEFAULT_DOCTOR_DATA.image;

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1520px] pb-28 text-[#17283b]">
        {/* Top Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f7f0] px-3 py-1 text-[11px] font-bold text-[#0e8a5e]">
                <span className="h-2 w-2 rounded-full bg-[#0e8a5e] animate-pulse" />
                Live on Homepage
              </span>
              {isDirty && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-[#073b43] sm:text-3xl">
              Doctor Section Management
            </h1>
            <p className="mt-1 text-[13px] text-[#55646f]">
              Manage the featured doctor profile, portrait photograph, qualification, clinical highlights, key benefits, and appointment CTAs.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToPreview}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-[#073b43] shadow-sm transition hover:bg-slate-50 hover:border-slate-400"
            >
              <Eye className="h-4 w-4 text-[#073b43]" />
              Live Preview
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || uploadingImage}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ed2f79] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(237,47,121,0.55)] transition hover:bg-[#d91d68] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl bg-white p-12 shadow-sm border border-slate-100">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#ed2f79]" />
              <p className="mt-3 text-[14px] font-semibold text-[#073b43]">
                Loading Doctor Section settings...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* GRID OF MANAGEMENT SECTIONS */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* SECTION 1: DOCTOR INFORMATION */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(7,59,67,0.06)] sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fdf0f5] text-[#ed2f79]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#073b43]">
                      1. Doctor Information
                    </h2>
                    <p className="text-[12px] text-[#6d7983]">
                      Doctor name, credentials, designation and biography
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Doctor Name */}
                  <div>
                    <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#073b43]">
                      Doctor Name <span className="text-[#ed2f79]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="e.g. Dr. Kishore Kumar"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafcfb] px-4 py-2.5 text-[14px] font-medium text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                    />
                  </div>

                  {/* Qualification & Designation */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#073b43]">
                        Qualification <span className="text-[#ed2f79]">*</span>
                      </label>
                      <input
                        type="text"
                        value={qualification}
                        onChange={(e) => {
                          setQualification(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. BDS, MDS"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafcfb] px-4 py-2.5 text-[13.5px] font-medium text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                      />
                    </div>

                    <div>
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#073b43]">
                        Designation <span className="text-[#ed2f79]">*</span>
                      </label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => {
                          setDesignation(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Chief Dental Surgeon & Specialist"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafcfb] px-4 py-2.5 text-[13.5px] font-medium text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                      />
                    </div>
                  </div>

                  {/* Description (Optional) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#073b43]">
                        Doctor Biography <span className="text-[11px] font-normal text-[#84929e]">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-[#84929e]">
                        {description.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Doctor's clinical background, warmth, approach to patient care, and philosophy..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafcfb] px-4 py-3 text-[13.5px] leading-relaxed text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                    />
                  </div>

                  {/* Section Subheading & Verification Council */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 border-t border-slate-100">
                    <div>
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-[#55646f]">
                        Section Top Badge
                      </label>
                      <input
                        type="text"
                        value={badgeText}
                        onChange={(e) => {
                          setBadgeText(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Dedicated Clinical Leadership"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-[#fafcfb] px-3.5 py-2 text-[12.5px] font-medium text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-[#55646f]">
                        Verified Council Badge
                      </label>
                      <input
                        type="text"
                        value={verifiedText}
                        onChange={(e) => {
                          setVerifiedText(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Tamil Nadu Dental Council"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-[#fafcfb] px-3.5 py-2 text-[12.5px] font-medium text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DOCTOR PROFILE IMAGE */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(7,59,67,0.06)] sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fdf0f5] text-[#ed2f79]">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#073b43]">
                        2. Doctor Profile Image <span className="text-[#ed2f79]">*</span>
                      </h2>
                      <p className="text-[12px] text-[#6d7983]">
                        Portrait photograph displayed on the left of the section
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-bold text-[#073b43]">
                    Rec: 600 × 750 px
                  </span>
                </div>

                <div className="mt-5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {image ? (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative aspect-[3.8/4.8] w-full max-w-[170px] overflow-hidden rounded-xl border border-white/80 shadow-md">
                          <img
                            src={previewImageUrl}
                            alt="Doctor portrait preview"
                            className="h-full w-full object-cover object-top"
                          />
                          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-2 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur">
                            Profile Photo
                          </span>
                        </div>

                        <div className="flex-1 space-y-2">
                          <p className="text-[13px] font-bold text-[#073b43]">
                            Current Doctor Image
                          </p>
                          <p className="break-all font-mono text-[11px] text-[#71808c]">
                            {image}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#073b43] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {uploadingImage ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Change Image
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveModal(true)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove Image
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-[#fafcfb] p-8 text-center transition hover:border-[#ed2f79] hover:bg-[#fff9fb]"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-[#073b43] group-hover:bg-[#fdf0f5] group-hover:text-[#ed2f79]">
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-[#ed2f79]" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>
                      <p className="mt-3 text-[13px] font-bold text-[#073b43]">
                        Upload Doctor Profile Image
                      </p>
                      <p className="mt-1 text-[11.5px] text-[#71808c]">
                        Recommended size: 600 × 750 px (PNG, JPG, WebP)
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImage(DEFAULT_DOCTOR_DATA.image);
                          setIsDirty(true);
                        }}
                        className="mt-3 text-[11.5px] font-semibold text-[#ed2f79] underline hover:text-[#d91d68]"
                      >
                        or use verified clinic portrait
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: EXPERIENCE & THREE HIGHLIGHT CARDS */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(7,59,67,0.06)] sm:p-7 lg:col-span-2">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fdf0f5] text-[#ed2f79]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#073b43]">
                      3. Experience &amp; Highlights (Three Cards)
                    </h2>
                    <p className="text-[12px] text-[#6d7983]">
                      Customize the three compact information highlight cards displayed beneath the biography
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Highlight Card 1: Experience */}
                  <div className="rounded-xl border border-slate-200 bg-[#fafcfb] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#0e8a5e]">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#073b43]">
                        Card 1: Experience
                      </span>
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Years of Experience
                      </label>
                      <input
                        type="text"
                        value={experience}
                        onChange={(e) => {
                          setExperience(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. 15+ Years"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Experience Title
                      </label>
                      <input
                        type="text"
                        value={experienceTitle}
                        onChange={(e) => {
                          setExperienceTitle(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Clinical Focus"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={experienceDesc}
                        onChange={(e) => {
                          setExperienceDesc(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Brief summary of clinical focus and gentle treatment..."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Highlight Card 2: Patient-First Care */}
                  <div className="rounded-xl border border-slate-200 bg-[#fafcfb] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#ed2f79]">
                      <HeartHandshake className="h-4 w-4" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#073b43]">
                        Card 2: Patient-First
                      </span>
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Title
                      </label>
                      <input
                        type="text"
                        value={patientFirstTitle}
                        onChange={(e) => {
                          setPatientFirstTitle(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Patient-First Philosophy"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={patientFirstDesc}
                        onChange={(e) => {
                          setPatientFirstDesc(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Transparent treatment plans with no rushed procedures..."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Highlight Card 3: Advanced Treatment */}
                  <div className="rounded-xl border border-slate-200 bg-[#fafcfb] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#073b43]">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#073b43]">
                        Card 3: Advanced Treatment
                      </span>
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Title
                      </label>
                      <input
                        type="text"
                        value={advancedTreatmentTitle}
                        onChange={(e) => {
                          setAdvancedTreatmentTitle(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Advanced Dental Technology"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#55646f]">
                        Description
                      </label>
                      <textarea
                        rows={4}
                        value={advancedTreatmentDesc}
                        onChange={(e) => {
                          setAdvancedTreatmentDesc(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Modern digital diagnostics, pain-free techniques and Class-B European sterilization..."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: KEY FEATURES */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(7,59,67,0.06)] sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fdf0f5] text-[#ed2f79]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#073b43]">
                        4. Key Features
                      </h2>
                      <p className="text-[12px] text-[#6d7983]">
                        Bullet points displayed with green checkmarks
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#073b43] shadow-sm transition hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#ed2f79]" />
                    Add Feature
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {keyFeatures.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#edf7f3] text-[#0e8a5e]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="e.g. Gentle Approach, Clear Treatment Plans..."
                        className="flex-1 rounded-xl border border-slate-200 bg-[#fafcfb] px-3.5 py-2 text-[13px] font-medium text-[#17283b] transition focus:border-[#ed2f79] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ed2f79]/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        title="Delete feature"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[11.5px] text-[#71808c] pt-1">
                    Defaults: <em>Gentle Approach, Clear Treatment Plans, All-Age Dental Care</em>.
                  </p>
                </div>
              </div>

              {/* SECTION 5: CTA BUTTONS */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(7,59,67,0.06)] sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fdf0f5] text-[#ed2f79]">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#073b43]">
                      5. Call to Action (CTA) Buttons
                    </h2>
                    <p className="text-[12px] text-[#6d7983]">
                      Primary profile exploration and secondary direct booking buttons
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Primary Button */}
                  <div className="rounded-xl border border-slate-100 bg-[#fafcfb] p-3.5 space-y-3">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-[#073b43]">
                      Primary Button (Filled Navy)
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-[#55646f]">
                          Button Text <span className="text-[#ed2f79]">*</span>
                        </label>
                        <input
                          type="text"
                          value={primaryBtnText}
                          onChange={(e) => {
                            setPrimaryBtnText(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. Explore Dentist Profile"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#55646f]">
                          Button Link <span className="text-[#ed2f79]">*</span>
                        </label>
                        <input
                          type="text"
                          value={primaryBtnLink}
                          onChange={(e) => {
                            setPrimaryBtnLink(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. /our-dentists"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Button */}
                  <div className="rounded-xl border border-slate-100 bg-[#fafcfb] p-3.5 space-y-3">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-[#073b43]">
                      Secondary Button (Outlined Calendar)
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-[#55646f]">
                          Button Text <span className="text-[#ed2f79]">*</span>
                        </label>
                        <input
                          type="text"
                          value={secondaryBtnText}
                          onChange={(e) => {
                            setSecondaryBtnText(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. Book With Dr. Kishore"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#55646f]">
                          Button Link <span className="text-[#ed2f79]">*</span>
                        </label>
                        <input
                          type="text"
                          value={secondaryBtnLink}
                          onChange={(e) => {
                            setSecondaryBtnLink(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. /booking?doctor=Dr.%20Kishore%20Kumar"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#17283b] focus:border-[#ed2f79] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: LIVE PREVIEW MATCHING HOMEPAGE */}
            <div
              ref={previewSectionRef}
              className="mt-12 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/90 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#ed2f79] text-white">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#073b43]">
                      6. Live Doctor Section Preview
                    </h3>
                    <p className="text-[12px] text-[#55646f]">
                      Real-time interactive preview replicating the exact Sri Saraswathi Dental Clinic homepage doctor profile section
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Instant Live Preview
                  </span>
                </div>
              </div>

              {/* SIMULATED HOMEPAGE DOCTOR SECTION */}
              <div className="bg-white px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
                <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
                  {/* Left Column: Doctor Photograph */}
                  <div className="relative mx-auto w-full max-w-[440px] lg:mx-0">
                    <div className="relative aspect-[3.8/4.8] overflow-hidden rounded-[28px] border border-[#ebe4de] bg-[#f0f4f3] shadow-[0_24px_55px_-30px_rgba(7,59,67,0.32)]">
                      <img
                        src={previewImageUrl}
                        alt={`${name} - ${designation}`}
                        className="h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#073b43]/90 via-[#073b43]/25 to-transparent" />

                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-md">
                          <Sparkles className="h-3 w-3 text-[#f090b7]" /> Chief Dental Specialist
                        </span>
                        <p className="mt-2 font-sans text-[22px] font-bold tracking-tight text-white sm:text-[24px]">
                          {name || "Dr. Kishore Kumar"}
                        </p>
                        <p className="text-[12px] text-white/80">
                          {qualification || "BDS"} · Over {experience || "15+ Years"} of Clinical Practice in Erode
                        </p>
                      </div>
                    </div>

                    {/* Floating verification badge */}
                    <div className="absolute -bottom-3 -right-2 z-10 flex items-center gap-2.5 rounded-2xl border border-[#ebe4de] bg-white px-4 py-3 shadow-[0_12px_32px_-16px_rgba(7,59,67,0.4)] sm:-bottom-4 sm:right-2 sm:px-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f3] text-[#0e8a5e]">
                        <UserCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0e8a5e]">
                          Verified Practitioner
                        </p>
                        <p className="text-[13px] font-bold text-[#073b43]">
                          {verifiedText || "Tamil Nadu Dental Council"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bio & Highlights */}
                  <div className="max-w-[620px]">
                    <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#ed2f79]">
                      <span className="h-2 w-2 rounded-full bg-[#0e8a5e]" />
                      {badgeText || "Dedicated Clinical Leadership"}
                    </span>

                    <h2 className="mt-3 font-sans text-[30px] sm:text-[38px] font-bold leading-[1.12] tracking-[-0.035em] text-[#073b43]">
                      Meet {name}.
                      <span className="block text-[20px] sm:text-[24px] font-semibold text-[#627278]">
                        {qualification} — {designation}
                      </span>
                    </h2>

                    <p className="mt-4 text-[14.5px] leading-[1.8] text-[#55656d]">
                      {description || DEFAULT_DOCTOR_DATA.description}
                    </p>

                    {/* Three compact highlight cards */}
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {/* Highlight Card 1: Experience & Focus */}
                      <div className="rounded-[18px] border border-[#ebe3df] bg-[#faf8f4] p-3.5 transition hover:border-[#ded5d0]">
                        <div className="flex items-center gap-2 text-[#073b43]">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[#0e8a5e] shadow-sm">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </span>
                          <h3 className="text-[12.5px] font-bold leading-tight">
                            {experience} {experienceTitle}
                          </h3>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#687680]">
                          {experienceDesc}
                        </p>
                      </div>

                      {/* Highlight Card 2: Patient-First Care */}
                      <div className="rounded-[18px] border border-[#ebe3df] bg-[#faf8f4] p-3.5 transition hover:border-[#ded5d0]">
                        <div className="flex items-center gap-2 text-[#073b43]">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[#ed2f79] shadow-sm">
                            <HeartHandshake className="h-3.5 w-3.5" />
                          </span>
                          <h3 className="text-[12.5px] font-bold leading-tight">
                            {patientFirstTitle}
                          </h3>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#687680]">
                          {patientFirstDesc}
                        </p>
                      </div>

                      {/* Highlight Card 3: Advanced Dental Technology */}
                      <div className="rounded-[18px] border border-[#ebe3df] bg-[#faf8f4] p-3.5 transition hover:border-[#ded5d0]">
                        <div className="flex items-center gap-2 text-[#073b43]">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[#073b43] shadow-sm">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <h3 className="text-[12.5px] font-bold leading-tight">
                            {advancedTreatmentTitle}
                          </h3>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#687680]">
                          {advancedTreatmentDesc}
                        </p>
                      </div>
                    </div>

                    {/* Key trust bullets / Key features */}
                    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11.5px] font-medium text-[#465a63]">
                      {keyFeatures.map((feat, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-[#0e8a5e]" /> {feat}
                        </span>
                      ))}
                    </div>

                    {/* Two CTAs */}
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <span className="inline-flex h-[46px] items-center gap-2 rounded-full bg-[#073b43] px-6 text-[13px] font-bold text-white shadow-md">
                        {primaryBtnText || "Explore Dentist Profile"}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                      <span className="inline-flex h-[46px] items-center gap-2 rounded-full border border-[#d9e2e2] bg-white px-5 text-[13px] font-bold text-[#073b43] shadow-sm">
                        <CalendarDays className="h-4 w-4 text-[#ed2f79]" />
                        {secondaryBtnText || "Book With Doctor"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md lg:left-[300px]">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes in Doctor Profile
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700">
                  <Check className="h-4 w-4 text-emerald-600" />
                  All changes published &amp; up-to-date
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={scrollToPreview}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-[#073b43] transition hover:bg-slate-50"
              >
                <Eye className="h-4 w-4 text-[#073b43]" />
                Preview
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || uploadingImage}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ed2f79] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(237,47,121,0.55)] transition hover:bg-[#d91d68] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* CONFIRM REMOVE IMAGE MODAL */}
        {confirmRemoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-50">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#073b43]">
                  Remove Doctor Image?
                </h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#55646f]">
                Are you sure you want to remove the current doctor profile image? The image will be cleared and you can upload a new photo or restore the clinic default portrait.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmRemoveModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-[13px] font-semibold text-[#55646f] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemoveImage}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-rose-700"
                >
                  Yes, Remove Image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
