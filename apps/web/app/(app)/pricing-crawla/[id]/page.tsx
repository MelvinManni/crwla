import { requireSession } from "@/lib/auth";
import { PricingResultsClient } from "./results-client";

export const metadata = {
  title: "Pricing results · CRWLA",
};

export default async function PricingResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <PricingResultsClient searchId={id} />
    </div>
  );
}
