import Link from "next/link";
import { PricingSection } from "@/components/marketing/PricingSection";
import HomeHeader from "@/components/layout/homeHeader";

export default function PlansPage() {
  return (
    <div className="min-h-screen  text-slate-900">
      <HomeHeader />
      <PricingSection
        variant="light"
        title="Elige tu plan"
        subtitle="Básico para FB, IG y YouTube. Premium desbloquea LinkedIn, TikTok e IA."
      />
    </div>
  );
}
