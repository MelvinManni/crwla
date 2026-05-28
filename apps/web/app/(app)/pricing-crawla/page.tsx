import { requireSession } from "@/lib/auth";
import { PricingCrawlaClient } from "./pricing-crawla-client";

export const metadata = {
  title: "Pricing · CRWLA",
};

export default async function PricingCrawlaPage() {
  await requireSession();
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <PricingCrawlaClient />
    </div>
  );
}
