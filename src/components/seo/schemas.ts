// src/components/seo/schemas.ts
// Sreesaraswathi Dental Clinic – JSON-LD Structured Data Schemas
// Verified Location: 866, Soli Complex, Surampatti Four Rd, Erode, Tamil Nadu 638009
// Official Domain: https://drkishoredentist.com

export const CLINIC_BASE_URL = "https://drkishoredentist.com";

export const CLINIC_NAP = {
  name: "Sreesaraswathi Dental Clinic",
  legalName: "Sri Saraswathi Dental Clinic",
  founder: "Dr. Kishore Kumar",
  qualifications: "BDS, MDS",
  streetAddress: "866, Soli Complex, Surampatti Four Rd",
  addressLocality: "Erode",
  addressRegion: "Tamil Nadu",
  postalCode: "638009",
  addressCountry: "IN",
  telephone: "+91-0424-427-2494",
  whatsapp: "+91-98657-53494",
  email: "info@srisaraswathidental.com",
  geo: {
    latitude: 11.3283,
    longitude: 77.7161,
  },
  googleMapsUrl: "https://share.google/Audp52vAIaRkaW1vL",
  priceRange: "₹₹",
  openingHours: [
    "Mo-Sa 09:00-20:45",
    "Su 09:00-13:00",
  ],
  logo: `${CLINIC_BASE_URL}/images/clinic/sri-saraswathi-logo-hd-transparent.png`,
  image: `${CLINIC_BASE_URL}/images/clinic/clinic-exterior.webp`,
};

/**
 * Primary Dentist / LocalBusiness / MedicalBusiness Schema
 */
export function getDentistLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Dentist", "MedicalBusiness", "LocalBusiness"],
    "@id": `${CLINIC_BASE_URL}/#dentist`,
    name: CLINIC_NAP.name,
    alternateName: [CLINIC_NAP.legalName, "Dr. Kishore Dental Clinic Erode"],
    url: CLINIC_BASE_URL,
    logo: CLINIC_NAP.logo,
    image: [
      CLINIC_NAP.image,
      `${CLINIC_BASE_URL}/images/clinic/clinic-reception.webp`,
      `${CLINIC_BASE_URL}/images/clinic/operatory-chair.webp`,
    ],
    telephone: CLINIC_NAP.telephone,
    email: CLINIC_NAP.email,
    priceRange: CLINIC_NAP.priceRange,
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, Credit Card, Debit Card, UPI, Net Banking",
    hasMap: CLINIC_NAP.googleMapsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: CLINIC_NAP.streetAddress,
      addressLocality: CLINIC_NAP.addressLocality,
      addressRegion: CLINIC_NAP.addressRegion,
      postalCode: CLINIC_NAP.postalCode,
      addressCountry: CLINIC_NAP.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: CLINIC_NAP.geo.latitude,
      longitude: CLINIC_NAP.geo.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "20:45",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "09:00",
        closes: "13:00",
        description: "Scheduled Emergency Dental Visits Only",
      },
    ],
    employee: [
      {
        "@type": "Person",
        name: "Dr. Kishore Kumar",
        jobTitle: "Chief Dental Surgeon & Implantologist",
        honorificPrefix: "Dr.",
        honorificSuffix: "BDS, MDS",
        alumniOf: "Tamil Nadu Dental Council",
        worksFor: { "@id": `${CLINIC_BASE_URL}/#dentist` },
      },
    ],
    sameAs: [
      CLINIC_NAP.googleMapsUrl,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: CLINIC_NAP.telephone,
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Tamil"],
    },
  };
}

/**
 * WebSite schema with internal SearchAction
 */
export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${CLINIC_BASE_URL}/#website`,
    url: CLINIC_BASE_URL,
    name: CLINIC_NAP.name,
    publisher: {
      "@id": `${CLINIC_BASE_URL}/#dentist`,
    },
    inLanguage: "en-IN",
  };
}

/**
 * BreadcrumbList Schema for page hierarchy
 */
export function getBreadcrumbSchema(items: Array<{ name: string; path?: string; url?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const rawTarget = item.path ?? item.url ?? "/";
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: rawTarget.startsWith("http") ? rawTarget : `${CLINIC_BASE_URL}${rawTarget.startsWith("/") ? rawTarget : `/${rawTarget}`}`,
      };
    }),
  };
}

/**
 * MedicalProcedure Schema for Treatment pages
 */
export function getMedicalProcedureSchema(treatment: {
  title?: string;
  name?: string;
  description: string;
  path?: string;
  url?: string;
  image?: string;
  procedureType?: string;
  duration?: string;
  price?: number;
}) {
  const procedureTitle = treatment.title || treatment.name || "Dental Treatment";
  const rawTarget = treatment.path ?? treatment.url ?? "/treatments";
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: procedureTitle,
    description: treatment.description,
    url: rawTarget.startsWith("http") ? rawTarget : `${CLINIC_BASE_URL}${rawTarget}`,
    image: treatment.image || CLINIC_NAP.image,
    procedureType: treatment.procedureType || "Dental Procedure",
    bodyLocation: "Tooth and Gums",
    howPerformed: "Performed in-clinic with gentle digital dentistry equipment by Dr. Kishore Kumar (BDS, MDS).",
    performer: {
      "@type": "Person",
      name: "Dr. Kishore Kumar",
      jobTitle: "Chief Dental Surgeon",
    },
  };
}

/**
 * Person Schema for Doctor Profiles
 */
export function getDoctorPersonSchema(doctor: {
  name: string;
  jobTitle?: string;
  qualification?: string;
  specialization?: string;
  experience?: string;
  image?: string;
  path?: string;
  url?: string;
  description?: string;
  worksFor?: string;
}) {
  const rawTarget = doctor.path ?? doctor.url ?? "/our-dentists";
  return {
    "@context": "https://schema.org",
    "@type": ["Person", "MedicalSpecialist"],
    name: doctor.name,
    honorificPrefix: "Dr.",
    honorificSuffix: doctor.qualification || "BDS, MDS",
    jobTitle: doctor.jobTitle || "Dental Specialist",
    medicalSpecialty: doctor.specialization || "General Dentistry",
    description: doctor.description || `${doctor.name} is a dental specialist in Erode with ${doctor.experience || "12+ Years"} clinical experience.`,
    image: doctor.image || `${CLINIC_BASE_URL}/images/clinic/dentist-portrait.webp`,
    url: rawTarget.startsWith("http") ? rawTarget : `${CLINIC_BASE_URL}${rawTarget}`,
    worksFor: {
      "@type": "Dentist",
      name: doctor.worksFor || CLINIC_NAP.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: CLINIC_NAP.streetAddress,
        addressLocality: CLINIC_NAP.addressLocality,
        addressRegion: CLINIC_NAP.addressRegion,
        postalCode: CLINIC_NAP.postalCode,
        addressCountry: CLINIC_NAP.addressCountry,
      },
    },
  };
}

export const getPersonSchema = getDoctorPersonSchema;
export const getDentistSchema = getDentistLocalBusinessSchema;
export const getLocalBusinessSchema = getDentistLocalBusinessSchema;

/**
 * FAQPage Schema
 */
export function getFAQPageSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

/**
 * BlogPosting / Article Schema
 */
export function getArticleSchema(article: {
  title?: string;
  headline?: string;
  description: string;
  path?: string;
  url?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  authorName?: string;
  publisherName?: string;
}) {
  const headline = article.headline || article.title || "Dental Article";
  const rawTarget = article.path ?? article.url ?? "/blog";
  const author = article.authorName || article.author || "Dr. Kishore Kumar (BDS, MDS)";
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description: article.description,
    url: rawTarget.startsWith("http") ? rawTarget : `${CLINIC_BASE_URL}${rawTarget}`,
    image: article.image || CLINIC_NAP.image,
    datePublished: article.datePublished || new Date().toISOString(),
    dateModified: article.dateModified || article.datePublished || new Date().toISOString(),
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: article.publisherName || CLINIC_NAP.name,
      logo: {
        "@type": "ImageObject",
        url: CLINIC_NAP.logo,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": rawTarget.startsWith("http") ? rawTarget : `${CLINIC_BASE_URL}${rawTarget}`,
    },
  };
}
