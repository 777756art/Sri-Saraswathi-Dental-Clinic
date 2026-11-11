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
      <div className="mx-auto w-full max-w-[1520px] pb-28 text-[#1F6878]">
        {/* Top Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#1F6878]/15 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F0F2] px-3 py-1 text-[11px] font-bold text-[#1F6878]">
                <span className="h-2 w-2 rounded-full bg-[#1F6878] animate-pulse" />
                Live on Homepage
              </span>
              {isDirty && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                  Unsaved changes
                </span>
              )}
            </div>
            <h1 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-[#1F6878] sm:text-3xl">
              Doctor Section Management
            </h1>
            <p className="mt-1 text-[13px] text-[#707574]">
              Manage the featured doctor profile, portrait photograph, qualification, clinical highlights, key benefits, and appointment CTAs.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToPreview}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#1F6878]/25 bg-white px-4 text-[13px] font-semibold text-[#1F6878] shadow-sm transition hover:bg-[#E4F0F2] hover:border-[#1F6878]/40"
            >
              <Eye className="h-4 w-4 text-[#1F6878]" />
              Live Preview
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving || uploadingImage}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#E95A35] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824] disabled:opacity-50"
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
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-[#1F6878]/15 bg-white p-12 shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1F6878]" />
              <p className="mt-3 text-[14px] font-semibold text-[#1F6878]">
                Loading Doctor Section settings...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* GRID OF MANAGEMENT SECTIONS */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* SECTION 1: DOCTOR INFORMATION */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-[#E4F0F2] pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1F6878]">
                      1. Doctor Information
                    </h2>
                    <p className="text-[12px] text-[#707574]">
                      Doctor name, credentials, designation and biography
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Doctor Name */}
                  <div>
                    <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                      Doctor Name <span className="text-[#E95A35]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="e.g. Dr. Kishore Kumar"
                      className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-2.5 text-[14px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                    />
                  </div>

                  {/* Qualification & Designation */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Qualification <span className="text-[#E95A35]">*</span>
                      </label>
                      <input
                        type="text"
                        value={qualification}
                        onChange={(e) => {
                          setQualification(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. BDS, MDS"
                        className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-2.5 text-[13.5px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                    </div>

                    <div>
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Designation <span className="text-[#E95A35]">*</span>
                      </label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => {
                          setDesignation(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Chief Dental Surgeon & Specialist"
                        className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-2.5 text-[13.5px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                    </div>
                  </div>

                  {/* Description (Optional) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Doctor Biography <span className="text-[11px] font-normal text-[#707574]">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-[#707574]">
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
                      className="mt-1.5 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-4 py-3 text-[13.5px] leading-relaxed text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                    />
                  </div>

                  {/* Section Subheading & Verification Council */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 border-t border-[#E4F0F2]">
                    <div>
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-[#1F6878]">
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
                        className="mt-1 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-3.5 py-2 text-[12.5px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11.5px] font-bold uppercase tracking-wider text-[#1F6878]">
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
                        className="mt-1 w-full rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-3.5 py-2 text-[12.5px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DOCTOR PROFILE IMAGE */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#1F6878]">
                        2. Doctor Profile Image <span className="text-[#E95A35]">*</span>
                      </h2>
                      <p className="text-[12px] text-[#707574]">
                        Portrait photograph displayed on the left of the section
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#1F6878]/20 bg-[#E4F0F2] px-2.5 py-1 text-[10.5px] font-bold text-[#1F6878]">
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
                    <div className="relative overflow-hidden rounded-2xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3.5">
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
                          <p className="text-[13px] font-bold text-[#1F6878]">
                            Current Doctor Image
                          </p>
                          <p className="break-all font-mono text-[11px] text-[#707574]">
                            {image}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F6878]/25 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1F6878] shadow-sm transition hover:bg-[#E4F0F2] disabled:opacity-50"
                            >
                              {uploadingImage ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1F6878]" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5 text-[#1F6878]" />
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
                      className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#1F6878]/25 bg-[#F5F2EB] p-8 text-center transition hover:border-[#1F6878] hover:bg-[#E4F0F2]/50"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[#E4F0F2] text-[#1F6878] group-hover:bg-[#E4F0F2] group-hover:text-[#E95A35]">
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 animate-spin text-[#1F6878]" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>
                      <p className="mt-3 text-[13px] font-bold text-[#1F6878]">
                        Upload Doctor Profile Image
                      </p>
                      <p className="mt-1 text-[11.5px] text-[#707574]">
                        Recommended size: 600 × 750 px (PNG, JPG, WebP)
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImage(DEFAULT_DOCTOR_DATA.image);
                          setIsDirty(true);
                        }}
                        className="mt-3 text-[11.5px] font-semibold text-[#E95A35] underline hover:text-[#D14824]"
                      >
                        or use verified clinic portrait
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: EXPERIENCE & THREE HIGHLIGHT CARDS */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7 lg:col-span-2">
                <div className="flex items-center gap-2.5 border-b border-[#E4F0F2] pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1F6878]">
                      3. Experience &amp; Highlights (Three Cards)
                    </h2>
                    <p className="text-[12px] text-[#707574]">
                      Customize the three compact information highlight cards displayed beneath the biography
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Highlight Card 1: Experience */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#1F6878]">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Card 1: Experience
                      </span>
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[12px] text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Highlight Card 2: Patient-First Care */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#E95A35]">
                      <HeartHandshake className="h-4 w-4" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Card 2: Patient-First
                      </span>
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[12px] text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Highlight Card 3: Advanced Treatment */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-4 space-y-3">
                    <div className="flex items-center gap-2 text-[#1F6878]">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#1F6878]">
                        Card 3: Advanced Treatment
                      </span>
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11.5px] font-bold uppercase text-[#1F6878]">
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
                        className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[12px] text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: KEY FEATURES */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center justify-between border-b border-[#E4F0F2] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-[#1F6878]">
                        4. Key Features
                      </h2>
                      <p className="text-[12px] text-[#707574]">
                        Bullet points displayed with green checkmarks
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F6878]/25 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#1F6878] shadow-sm transition hover:bg-[#E4F0F2]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#1F6878]" />
                    Add Feature
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {keyFeatures.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#E4F0F2] text-[#1F6878]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="e.g. Gentle Approach, Clear Treatment Plans..."
                        className="flex-1 rounded-xl border border-[#1F6878]/20 bg-[#F5F2EB] px-3.5 py-2 text-[13px] font-medium text-[#1F6878] transition focus:border-[#1F6878] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F6878]/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        title="Delete feature"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#707574] hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[11.5px] text-[#707574] pt-1">
                    Defaults: <em>Gentle Approach, Clear Treatment Plans, All-Age Dental Care</em>.
                  </p>
                </div>
              </div>

              {/* SECTION 5: CTA BUTTONS */}
              <div className="rounded-2xl border border-[#1F6878]/15 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(31,104,120,0.06)] sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-[#E4F0F2] pb-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#E4F0F2] text-[#E95A35]">
                    <MousePointerClick className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1F6878]">
                      5. Call to Action (CTA) Buttons
                    </h2>
                    <p className="text-[12px] text-[#707574]">
                      Primary profile exploration and secondary direct booking buttons
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Primary Button */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3.5 space-y-3">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                      Primary Button (Filled Care Pink)
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-[#1F6878]">
                          Button Text <span className="text-[#E95A35]">*</span>
                        </label>
                        <input
                          type="text"
                          value={primaryBtnText}
                          onChange={(e) => {
                            setPrimaryBtnText(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. Explore Dentist Profile"
                          className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#1F6878]">
                          Button Link <span className="text-[#E95A35]">*</span>
                        </label>
                        <input
                          type="text"
                          value={primaryBtnLink}
                          onChange={(e) => {
                            setPrimaryBtnLink(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. /our-dentists"
                          className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Button */}
                  <div className="rounded-xl border border-[#1F6878]/15 bg-[#F5F2EB] p-3.5 space-y-3">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-[#1F6878]">
                      Secondary Button (Outlined Calendar)
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-[#1F6878]">
                          Button Text <span className="text-[#E95A35]">*</span>
                        </label>
                        <input
                          type="text"
                          value={secondaryBtnText}
                          onChange={(e) => {
                            setSecondaryBtnText(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. Book With Dr. Kishore"
                          className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#1F6878]">
                          Button Link <span className="text-[#E95A35]">*</span>
                        </label>
                        <input
                          type="text"
                          value={secondaryBtnLink}
                          onChange={(e) => {
                            setSecondaryBtnLink(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="e.g. /booking?doctor=Dr.%20Kishore%20Kumar"
                          className="mt-1 w-full rounded-lg border border-[#1F6878]/20 bg-white px-3 py-2 text-[13px] font-medium text-[#1F6878] focus:border-[#1F6878] focus:outline-none"
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
              className="mt-12 overflow-hidden rounded-3xl border border-[#1F6878]/15 bg-white shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F6878]/10 bg-[#F5F2EB] px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#E4F0F2] text-[#E95A35]">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#1F6878]">
                      6. Live Doctor Section Preview
                    </h3>
                    <p className="text-[12px] text-[#707574]">
                      Real-time interactive preview replicating the exact Sri Saraswathi Dental Clinic homepage doctor profile section
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1F6878]/20 bg-[#E4F0F2] px-3 py-1 text-[11px] font-bold text-[#1F6878]">
                    <span className="h-2 w-2 rounded-full bg-[#1F6878] animate-pulse" />
                    Instant Live Preview
                  </span>
                </div>
              </div>

              {/* SIMULATED HOMEPAGE DOCTOR SECTION */}
              <div className="bg-white px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
                <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
                  {/* Left Column: Doctor Photograph */}
                  <div className="relative mx-auto w-full max-w-[440px] lg:mx-0">
                    <div className="relative aspect-[3.8/4.8] overflow-hidden rounded-[28px] border border-[#1F6878]/15 bg-[#E4F0F2] shadow-[0_24px_55px_-30px_rgba(31,104,120,0.32)]">
                      <img
                        src={previewImageUrl}
                        alt={`${name} - ${designation}`}
                        className="h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F6878]/90 via-[#1F6878]/25 to-transparent" />

                      <div className="absolute bottom-5 left-5 right-5 text-white">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-md">
                          <Sparkles className="h-3 w-3 text-[#E4F0F2]" /> Chief Dental Specialist
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
                    <div className="absolute -bottom-3 -right-2 z-10 flex items-center gap-2.5 rounded-2xl border border-[#dce4e5] bg-white px-4 py-3 shadow-[0_12px_32px_-16px_rgba(31,104,120,0.4)] sm:-bottom-4 sm:right-2 sm:px-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E4F0F2] text-[#1F6878]">
                        <UserCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1F6878]">
                          Verified Practitioner
                        </p>
                        <p className="text-[13px] font-bold text-[#1F6878]">
                          {verifiedText || "Tamil Nadu Dental Council"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Bio & Highlights */}
                  <div className="max-w-[640px]">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#E95A35] bg-[#E95A35] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_-8px_rgba(233,90,53,0.6)]">
                      <span className="h-2 w-2 rounded-full bg-white" />
                      {badgeText || "Dedicated Clinical Leadership"}
                    </span>

                    <h2 className="mt-[20px] font-sans text-[30px] sm:text-[38px] font-bold leading-[1.15] tracking-[-0.035em] text-[#1F6878]">
                      Meet {name}.
                      <span className="mt-[8px] block text-[19px] sm:text-[23px] font-semibold leading-[1.35] text-[#1F6878]">
                        {qualification} — {designation}
                      </span>
                    </h2>
                    <div className="mt-[14px] h-1 w-14 rounded-full bg-[#1F6878]" />

                    <p className="mt-[22px] max-w-[590px] text-[16.5px] leading-[1.8] text-[#707574] sm:text-[17px]">
                      {description || DEFAULT_DOCTOR_DATA.description}
                    </p>

                    {/* Three compact highlight cards */}
                    <div className="mt-[28px] grid items-stretch gap-3.5 sm:grid-cols-3">
                      {/* Highlight Card 1: Experience & Focus */}
                      <div className="flex h-full flex-col rounded-[18px] border border-[#1F6878]/15 bg-[#E4F0F2]/85 p-4 transition hover:border-[#1F6878]/35">
                        <div className="flex items-center gap-2.5 text-[#1F6878]">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#1F6878] shadow-sm">
                            <ShieldCheck className="h-4 w-4" />
                          </span>
                          <h3 className="text-[13px] font-bold leading-snug">
                            {experience} {experienceTitle}
                          </h3>
                        </div>
                        <p className="mt-2.5 text-[11.5px] leading-[1.65] text-[#707574]">
                          {experienceDesc}
                        </p>
                      </div>

                      {/* Highlight Card 2: Patient-First Care */}
                      <div className="flex h-full flex-col rounded-[18px] border border-[#1F6878]/15 bg-[#E4F0F2]/85 p-4 transition hover:border-[#1F6878]/35">
                        <div className="flex items-center gap-2.5 text-[#1F6878]">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#1F6878] shadow-sm">
                            <HeartHandshake className="h-4 w-4" />
                          </span>
                          <h3 className="text-[13px] font-bold leading-snug">
                            {patientFirstTitle}
                          </h3>
                        </div>
                        <p className="mt-2.5 text-[11.5px] leading-[1.65] text-[#707574]">
                          {patientFirstDesc}
                        </p>
                      </div>

                      {/* Highlight Card 3: Advanced Dental Technology */}
                      <div className="flex h-full flex-col rounded-[18px] border border-[#1F6878]/15 bg-[#E4F0F2]/85 p-4 transition hover:border-[#1F6878]/35">
                        <div className="flex items-center gap-2.5 text-[#1F6878]">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#1F6878] shadow-sm">
                            <Sparkles className="h-4 w-4" />
                          </span>
                          <h3 className="text-[13px] font-bold leading-snug">
                            {advancedTreatmentTitle}
                          </h3>
                        </div>
                        <p className="mt-2.5 text-[11.5px] leading-[1.65] text-[#707574]">
                          {advancedTreatmentDesc}
                        </p>
                      </div>
                    </div>

                    {/* Key trust bullets / Key features */}
                    <div className="mt-[24px] flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-[#1F6878]">
                      {keyFeatures.map((feat, index) => (
                        <span key={index} className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F6878]" /> {feat}
                        </span>
                      ))}
                    </div>

                    {/* Two CTAs */}
                    <div className="mt-[30px] flex flex-wrap items-center gap-3.5">
                      <span className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#E95A35] px-7 text-[13px] font-bold text-white shadow-[0_12px_26px_-10px_rgba(233,90,53,0.55)]">
                        <CalendarDays className="h-4 w-4" />
                        {secondaryBtnText || "Book With Doctor"}
                      </span>
                      <span className="inline-flex h-[48px] items-center gap-2 rounded-full border border-[#1F6878] bg-white px-6 text-[13px] font-bold text-[#1F6878] shadow-sm">
                        {primaryBtnText || "Explore Dentist Profile"}
                        <ArrowRight className="h-4 w-4 text-[#1F6878]" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM STICKY ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1F6878]/15 bg-white/95 p-4 backdrop-blur-md lg:left-[300px]">
          <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes in Doctor Profile
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1F6878]">
                  <Check className="h-4 w-4 text-[#1F6878]" />
                  All changes published &amp; up-to-date
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={scrollToPreview}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#1F6878]/25 bg-white px-4 text-[13px] font-semibold text-[#1F6878] transition hover:bg-[#E4F0F2]"
              >
                <Eye className="h-4 w-4 text-[#1F6878]" />
                Preview
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving || uploadingImage}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#E95A35] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(233,90,53,0.55)] transition hover:bg-[#D14824] disabled:opacity-50"
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
                <h3 className="font-display text-lg font-bold text-[#1F6878]">
                  Remove Doctor Image?
                </h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#707574]">
                Are you sure you want to remove the current doctor profile image? The image will be cleared and you can upload a new photo or restore the clinic default portrait.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmRemoveModal(false)}
                  className="rounded-xl border border-[#1F6878]/25 px-4 py-2 text-[13px] font-semibold text-[#1F6878] hover:bg-[#E4F0F2]"
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
