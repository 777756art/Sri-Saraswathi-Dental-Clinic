import { ServicesOverview } from "@/components/home/ServicesOverview";
import { SEOHead } from "@/components/seo/SEOHead";
import { getBreadcrumbSchema } from "@/components/seo/schemas";

export default function TreatmentsPage() {
  return (
    <main className="min-h-screen bg-[#F5F2EB]">
      <SEOHead
        title="Dental Treatments in Erode | Sreesaraswathi Dental Clinic"
        description="Comprehensive dental treatments in Erode by Dr. Kishore Kumar. Painless Root Canals, Dental Implants, Braces, Teeth Cleaning, Whitening & Pediatric Care."
        canonicalPath="/treatments"
        keywords={[
          "Dental Treatments in Erode",
          "Root Canal Treatment in Erode",
          "Dental Implants in Erode",
          "Teeth Cleaning in Erode",
          "Teeth Whitening in Erode",
          "Braces Treatment in Erode",
          "Cosmetic Dentist in Erode",
        ]}
        schema={getBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Treatments", path: "/treatments" },
        ])}
      />
      <ServicesOverview fullPage />
    </main>
  );
}
