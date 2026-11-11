import { ServicesOverview } from "@/components/home/ServicesOverview";
import { LiveChat } from "@/components/home/LiveChat";

export default function TreatmentsPage() {
  return (
    <>
      <main className="min-h-screen bg-[#F5F2EB]">
        <ServicesOverview fullPage />
      </main>
      <LiveChat />
    </>
  );
}
