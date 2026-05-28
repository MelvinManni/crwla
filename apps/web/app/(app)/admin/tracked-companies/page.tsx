import { cookies } from "next/headers";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import type { TrackedCompanyView } from "@/lib/queries/job-search";
import { TrackedCompaniesClient } from "./tracked-companies-client";

export const metadata = {
  title: "Tracked companies · CRWLA",
};

export default async function TrackedCompaniesPage() {
  await requireAdmin();
  const jar = await cookies();
  const cookie = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const initial = await api.get<{ items: TrackedCompanyView[] }>(
    "/admin/tracked-companies",
    { cookie },
  );
  return (
    <div className="mx-auto px-4 py-6 md:px-8">
      <TrackedCompaniesClient initial={initial.items} />
    </div>
  );
}
