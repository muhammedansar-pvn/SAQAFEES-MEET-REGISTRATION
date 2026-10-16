import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { EVENT_CONFIG } from "@/config/event.config";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  await connectToDatabase();

  const totalRegistrations = await Participant.countDocuments();
  const checkedInCount = await Participant.countDocuments({ checkInStatus: true });
  const pendingCheckInCount = totalRegistrations - checkedInCount;

  // Shuhba-wise aggregation
  const shuhbaAggregation = await Participant.aggregate([
    {
      $group: {
        _id: "$shuhba",
        count: { $sum: 1 },
        checkedIn: {
          $sum: { $cond: ["$checkInStatus", 1, 0] },
        },
      },
    },
  ]);

  const shuhbaStats: Record<string, { total: number; checkedIn: number }> = {};
  EVENT_CONFIG.shuhbaOptions.forEach((shuhba) => {
    shuhbaStats[shuhba] = { total: 0, checkedIn: 0 };
  });

  shuhbaAggregation.forEach((item) => {
    if (item._id) {
      shuhbaStats[item._id] = {
        total: item.count,
        checkedIn: item.checkedIn,
      };
    }
  });

  // Recent registrations
  const recentRegistrations = await Participant.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("registrationId name place shuhba createdAt checkInStatus");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-[#132238]">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold">Admin Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {EVENT_CONFIG.name} — {EVENT_CONFIG.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/admin/scanner"
            className="px-3.5 py-2 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-medium transition-colors"
          >
            Open Scanner
          </Link>
          <Link
            href="/admin/participants"
            className="px-3.5 py-2 rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition-colors"
          >
            Participants
          </Link>
          <a
            href="/api/admin/export"
            download
            className="px-3.5 py-2 rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl p-5">
          <span className="text-xs text-gray-500 font-medium">Total Registrations</span>
          <p className="text-2xl font-bold mt-1 text-[#132238]">{totalRegistrations}</p>
        </div>

        <div className="border border-gray-200 rounded-xl p-5">
          <span className="text-xs text-gray-500 font-medium">Checked In</span>
          <p className="text-2xl font-bold mt-1 text-emerald-700">{checkedInCount}</p>
        </div>

        <div className="border border-gray-200 rounded-xl p-5">
          <span className="text-xs text-gray-500 font-medium">Pending Check-in</span>
          <p className="text-2xl font-bold mt-1 text-gray-700">{pendingCheckInCount}</p>
        </div>
      </div>

      {/* Two Column Section: Department Breakdown & Recent Registrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Shuhba Breakdown */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold border-b border-gray-100 pb-2">
            Department Breakdown
          </h2>
          <div className="divide-y divide-gray-100 text-xs">
            {EVENT_CONFIG.shuhbaOptions.map((shuhba) => {
              const stat = shuhbaStats[shuhba] || { total: 0, checkedIn: 0 };
              return (
                <div key={shuhba} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-gray-800">{shuhba}</span>
                  <span className="text-gray-500 font-mono">
                    {stat.total} registered · {stat.checkedIn} checked in
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-bold">Recent Registrations</h2>
            <Link
              href="/admin/participants"
              className="text-xs text-[#132238] underline hover:text-[#C5A059]"
            >
              View all →
            </Link>
          </div>

          {recentRegistrations.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">
              No participants registered yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {recentRegistrations.map((p) => (
                <div key={p.registrationId} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {p.registrationId} · {p.shuhba}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.checkInStatus
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.checkInStatus ? "Checked In" : "Registered"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
