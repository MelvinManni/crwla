import { requireSession } from "@/lib/auth";
import { PricingDetailClient } from "./detail-client";

export const metadata = {
  title: "Product detail · CRWLA",
};

export default async function PricingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <PricingDetailClient resultId={id} />
    </div>
  );
}
