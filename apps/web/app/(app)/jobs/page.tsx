import { requireSession } from "@/lib/auth";
import { JobsClient } from "./jobs-client";

export const metadata = {
  title: "Jobs · CRWLA",
};

export default async function JobsPage() {
  await requireSession();
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <JobsClient />
    </div>
  );
}
