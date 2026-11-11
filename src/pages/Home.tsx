import { useEffect } from "react";
import { Hero } from "@/components/home/Hero";
import { ClinicHighlights } from "@/components/home/ClinicHighlights";
import { FeaturedDoctor } from "@/components/home/FeaturedDoctor";
import { DentalReels } from "@/components/home/DentalReels";
import { TreatmentsOffered } from "@/components/home/TreatmentsOffered";
import { PromotionalAppointmentBanner } from "@/components/home/PromotionalAppointmentBanner";
import { DentalCommunicationShowcase } from "@/components/home/DentalCommunicationShowcase";
import { BeforeAfterShowcaseSection } from "@/components/home/BeforeAfterShowcaseSection";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { LatestDentalBlogs } from "@/components/home/LatestDentalBlogs";
import { FinalHomepageGallery } from "@/components/home/FinalHomepageGallery";
import { LiveChat } from "@/components/home/LiveChat";

export default function HomePage() {
  useEffect(() => {
    document.title = "Sri Saraswathi Dental Clinic — Comprehensive Care in Erode";
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F2EB]">
      {/* Section 01 – Hero Banner */}
      <Hero />

      {/* Section 02 – Clinic Highlights */}
      <ClinicHighlights />

      {/* Section 03 – Featured Doctor Introduction */}
      <FeaturedDoctor />

      {/* Section 04 – Watch Our Dental Reels */}
      <DentalReels />

      {/* Section 05 – Treatments Offered */}
      <TreatmentsOffered />

      {/* Section 06 – Promotional Appointment Banner */}
      <PromotionalAppointmentBanner />

      {/* Section 07 – Dental Communication / Information Showcase */}
      <DentalCommunicationShowcase />

      {/* Section 08 – Before & After Showcase */}
      <BeforeAfterShowcaseSection />

      {/* Section 09 – Why Choose Us */}
      <WhyChooseUs />

      {/* Section 10 – Latest Dental Blogs */}
      <LatestDentalBlogs />

      {/* Section 11 – Final Homepage Showcase / Gallery */}
      <FinalHomepageGallery />

      {/* Interactive Live Chat Floating Drawer */}
      <LiveChat />
    </main>
  );
}
