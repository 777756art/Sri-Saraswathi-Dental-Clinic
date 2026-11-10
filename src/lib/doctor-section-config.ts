import type { SiteContent } from "@/lib/api";

export interface DoctorSectionData {
  // Doctor Information
  name: string;
  qualification: string;
  designation: string;
  description: string;

  // Profile Image
  image: string;

  // Experience & Highlights
  experience: string; // e.g. "15+ Years"
  experienceTitle: string; // e.g. "Clinical Focus"
  experienceDesc: string; // e.g. "Experienced in modern root canal therapy, aesthetic restorations, and gentle preventive care."
  patientFirstTitle: string; // e.g. "Patient-First Philosophy"
  patientFirstDesc: string; // e.g. "Transparent treatment plans with no rushed procedures and total comfort at your pace."
  advancedTreatmentTitle: string; // e.g. "Advanced Dental Technology"
  advancedTreatmentDesc: string; // e.g. "Modern digital diagnostics, pain-free techniques and European Class-B sterilization."

  // Key Features
  keyFeatures: string[];

  // CTA Buttons
  primaryBtnText: string;
  primaryBtnLink: string;
  secondaryBtnText: string;
  secondaryBtnLink: string;

  // Verified Badge / Intro
  badgeText?: string;
  verifiedText?: string;
}

export const DEFAULT_DOCTOR_DATA: DoctorSectionData = {
  name: "Dr. Kishore Kumar",
  qualification: "BDS",
  designation: "Chief Dental Surgeon & Specialist",
  description:
    "With more than 15 years of dedicated practice in Surampatti, Erode, Dr. Kishore Kumar combines advanced clinical precision with genuine warmth and patient empathy. He believes in listening first, thoroughly explaining every treatment step, and delivering gentle, pain-free dental care tailored to each patient’s personal comfort.",
  image: "/images/clinic/dentist-portrait.webp",
  experience: "15+ Years",
  experienceTitle: "Clinical Focus",
  experienceDesc:
    "Experienced in modern root canal therapy, aesthetic restorations, and gentle preventive care.",
  patientFirstTitle: "Patient-First Philosophy",
  patientFirstDesc:
    "Transparent treatment plans with no rushed procedures and total comfort at your pace.",
  advancedTreatmentTitle: "Advanced Dental Technology",
  advancedTreatmentDesc:
    "Modern digital diagnostics, pain-free techniques and European Class-B sterilization.",
  keyFeatures: [
    "Gentle Approach",
    "Clear Treatment Plans",
    "All-Age Dental Care",
  ],
  primaryBtnText: "Explore Dentist Profile",
  primaryBtnLink: "/our-dentists",
  secondaryBtnText: "Book With Dr. Kishore",
  secondaryBtnLink: "/booking?doctor=Dr.%20Kishore%20Kumar",
  badgeText: "Dedicated Clinical Leadership",
  verifiedText: "Tamil Nadu Dental Council",
};

export function parseDoctorData(item?: SiteContent | null): DoctorSectionData {
  if (!item) return { ...DEFAULT_DOCTOR_DATA };

  let extra: Partial<DoctorSectionData> = {};
  if (item.body) {
    try {
      extra = JSON.parse(item.body);
    } catch {
      extra = { description: item.body };
    }
  }

  const description =
    extra.description ||
    (item.body && item.body.trim().length > 10 ? item.body : "") ||
    (item.excerpt && item.excerpt.trim().length > 10 ? item.excerpt : "") ||
    DEFAULT_DOCTOR_DATA.description;

  return {
    name: item.title || DEFAULT_DOCTOR_DATA.name,
    qualification: item.qualification || DEFAULT_DOCTOR_DATA.qualification,
    designation: item.specialization || DEFAULT_DOCTOR_DATA.designation,
    description,
    image: item.mediaUrl || DEFAULT_DOCTOR_DATA.image,
    experience: item.yearsExperience || DEFAULT_DOCTOR_DATA.experience,
    experienceTitle: extra.experienceTitle || DEFAULT_DOCTOR_DATA.experienceTitle,
    experienceDesc: extra.experienceDesc || DEFAULT_DOCTOR_DATA.experienceDesc,
    patientFirstTitle: extra.patientFirstTitle || DEFAULT_DOCTOR_DATA.patientFirstTitle,
    patientFirstDesc: extra.patientFirstDesc || DEFAULT_DOCTOR_DATA.patientFirstDesc,
    advancedTreatmentTitle:
      extra.advancedTreatmentTitle || DEFAULT_DOCTOR_DATA.advancedTreatmentTitle,
    advancedTreatmentDesc:
      extra.advancedTreatmentDesc || DEFAULT_DOCTOR_DATA.advancedTreatmentDesc,
    keyFeatures:
      Array.isArray(extra.keyFeatures) && extra.keyFeatures.length > 0
        ? extra.keyFeatures
        : DEFAULT_DOCTOR_DATA.keyFeatures,
    primaryBtnText: item.ctaLabel || DEFAULT_DOCTOR_DATA.primaryBtnText,
    primaryBtnLink: item.linkUrl || DEFAULT_DOCTOR_DATA.primaryBtnLink,
    secondaryBtnText: item.secondaryCtaLabel || DEFAULT_DOCTOR_DATA.secondaryBtnText,
    secondaryBtnLink: item.secondaryCtaUrl || DEFAULT_DOCTOR_DATA.secondaryBtnLink,
    badgeText: item.badgeText || DEFAULT_DOCTOR_DATA.badgeText,
    verifiedText: item.trustBadgeText || DEFAULT_DOCTOR_DATA.verifiedText,
  };
}

export function serializeDoctorData(data: DoctorSectionData) {
  const bodyPayload = JSON.stringify({
    description: data.description.trim(),
    experienceTitle: data.experienceTitle.trim(),
    experienceDesc: data.experienceDesc.trim(),
    patientFirstTitle: data.patientFirstTitle.trim(),
    patientFirstDesc: data.patientFirstDesc.trim(),
    advancedTreatmentTitle: data.advancedTreatmentTitle.trim(),
    advancedTreatmentDesc: data.advancedTreatmentDesc.trim(),
    keyFeatures: data.keyFeatures.map((f) => f.trim()).filter(Boolean),
  });

  return {
    type: "doctor" as const,
    title: data.name.trim(),
    qualification: data.qualification.trim(),
    specialization: data.designation.trim(),
    excerpt: data.description.trim().slice(0, 390),
    body: bodyPayload,
    mediaUrl: data.image.trim(),
    yearsExperience: data.experience.trim(),
    ctaLabel: data.primaryBtnText.trim(),
    linkUrl: data.primaryBtnLink.trim(),
    secondaryCtaLabel: data.secondaryBtnText.trim(),
    secondaryCtaUrl: data.secondaryBtnLink.trim(),
    badgeText: data.badgeText?.trim() || "Dedicated Clinical Leadership",
    trustBadgeText: data.verifiedText?.trim() || "Tamil Nadu Dental Council",
    homepageHighlight: 1,
    published: 1,
    displayOrder: 0,
  };
}
