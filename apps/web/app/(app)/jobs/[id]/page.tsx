import { requireSession } from "@/lib/auth";
import { JobResultsClient } from "./results-client";

export const metadata = {
  title: "Job search results · CRWLA",
};

export default async function JobResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <JobResultsClient searchId={id} />
    </div>
  );
}
