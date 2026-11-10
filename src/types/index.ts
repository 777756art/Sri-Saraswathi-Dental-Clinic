export interface ServicePageData {
  title: string;
  description: string;
  overview: string;
  benefits: string[];
  procedureSteps: { title: string; description: string }[];
  estimatedDuration: string;
  recoveryGuidance: string[];
  faqs: { question: string; answer: string }[];
  priceRange?: string;
  image?: string;
}

export interface DentistProfile {
  id: string;
  name: string;
  photo: string;
  qualifications: string[];
  experience: number;
  specializations: string[];
  languages: string[];
  memberships: string[];
  awards: string[];
  consultationAvailable: boolean;
  bio: string;
  reviews: { rating: number; content: string; patient: string }[];
}

export interface AppointmentSlot {
  date: string;
  startTime: string;
  endTime: string;
  staffId: string;
  staffName: string;
  available: boolean;
}

export interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  newPatients: number;
  totalPatients: number;
  revenueToday: number;
  revenueMonth: number;
  noShowRate: number;
  treatmentAcceptanceRate: number;
  patientSatisfaction: number;
  appointmentUtilization: number;
}

export interface AITriageResult {
  urgency: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
  suggestedAction: string;
  recommendedTiming: string;
  notes: string;
  disclaimer: string;
}

export interface AIDocumentationResult {
  consultationNotes: string;
  diagnosis: string;
  treatmentRecommendations: string;
  prescriptions: string[];
  followUpPlan: string;
}

export interface AIFollowUpPlan {
  reminders: {
    type: string;
    message: string;
    timing: string;
    frequency: string;
  }[];
}
