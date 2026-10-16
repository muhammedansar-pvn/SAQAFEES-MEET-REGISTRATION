import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ParticipantTable } from "@/features/admin/ParticipantTable";

export default async function ParticipantsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-[#132238] space-y-6">
      <div className="border-b border-gray-200 pb-3">
        <h1 className="text-xl font-bold">Participants</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          View, search, edit, and export attendee registrations.
        </p>
      </div>

      <ParticipantTable />
    </div>
  );
}
