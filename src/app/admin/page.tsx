import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { EVENT_CONFIG } from "@/config/event.config";
import { calculateDepartmentProgress } from "@/features/departments/progress";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  await connectToDatabase();

  // Exclude cancelled or invalid registrations
  const validFilter = {
    $or: [
      { status: { $exists: false } },
      { status: { $nin: ["cancelled", "invalid", "rejected"] } },
    ],
  };

  const totalRegistrations = await Participant.countDocuments(validFilter);
  const checkedInCount = await Participant.countDocuments({
    ...validFilter,
    checkInStatus: true,
  });
  const pendingCheckInCount = totalRegistrations - checkedInCount;

  // Shuhba-wise aggregation
  const shuhbaAggregation = await Participant.aggregate([
    { $match: validFilter },
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

  // Calculate sorted department progress & targets
  const { departments: departmentProgress, overall: overallProgress } =
    calculateDepartmentProgress(shuhbaAggregation);

  // Recent registrations
  const recentRegistrations = await Participant.find(validFilter)
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

        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 text-xs w-full sm:w-auto">
          <Link
            href="/admin/scanner"
            className="px-2.5 sm:px-3.5 py-2 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-medium transition-colors text-center truncate"
          >
            Scanner
          </Link>
          <Link
            href="/admin/participants"
            className="px-2.5 sm:px-3.5 py-2 rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition-colors text-center truncate"
          >
            Participants
          </Link>
          <a
            href="/api/admin/export"
            download
            className="px-2.5 sm:px-3.5 py-2 rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition-colors text-center truncate"
          >
            CSV
          </a>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="border border-gray-200 rounded-xl p-3 sm:p-5">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate block">
            Total Registrations
          </span>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-[#132238]">
            {totalRegistrations}
            <span className="text-xs font-normal text-gray-400 ml-1.5">
              / {overallProgress.totalTarget} ({overallProgress.completionPercentage}%)
            </span>
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl p-3 sm:p-5">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate block">
            Checked In
          </span>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-emerald-700">
            {checkedInCount}
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl p-3 sm:p-5">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium truncate block">
            Pending Check-In
          </span>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 text-gray-700">
            {pendingCheckInCount}
          </p>
        </div>
      </div>

      {/* Two Column Section: Department Progress & Recent Registrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Department Registration Progress (Sorted descending by completion percentage) */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h2 className="text-sm font-bold text-[#132238]">Department Progress</h2>
              <p className="text-[10px] text-gray-400">Ranked by completion percentage</p>
            </div>
            <Link
              href="/admin/participants"
              className="text-xs text-[#132238] underline hover:text-[#C5A059]"
            >
              Manage →
            </Link>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {departmentProgress.map((dept, index) => (
              <div key={dept.code} className="py-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-mono">
                      #{index + 1}
                    </span>
                    <span className="font-bold text-gray-800">{dept.name}</span>
                    <span className="text-[10px] text-gray-400">({dept.code})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-[#132238]">
                      {dept.registeredCount} / {dept.target}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        dept.completionPercentage >= 100
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : dept.completionPercentage >= 50
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {dept.completionPercentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar (capped at 100%) */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dept.completionPercentage >= 100
                        ? "bg-emerald-500"
                        : dept.completionPercentage >= 50
                        ? "bg-blue-600"
                        : "bg-[#132238]"
                    }`}
                    style={{ width: `${dept.visualPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>{dept.checkedInCount} checked in</span>
                  <span>
                    {dept.remaining > 0 ? (
                      <span className="text-gray-500 font-medium">{dept.remaining} remaining</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Target Met!</span>
                    )}
                  </span>
                </div>
              </div>
            ))}
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

      {/* Prominent Overall Registration Count Banner at Bottom */}
      <div className="rounded-2xl p-5 sm:p-6 bg-[#132238] text-white shadow-sm border border-[#1e3456] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C5A059]">
            Official Event Ledger
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">
            TOTAL REGISTRATIONS: {totalRegistrations}
          </h2>
          <p className="text-xs text-gray-300 mt-1">
            Real-time count verified directly from MongoDB database
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
          <Link
            href="/admin/participants"
            className="h-10 px-4 rounded-lg bg-[#C5A059] hover:bg-[#b08c45] text-[#132238] font-bold text-xs flex items-center justify-center transition-colors text-center"
          >
            Manage Participants →
          </Link>
          <a
            href="/api/admin/export"
            download
            className="h-10 px-4 flex items-center justify-center rounded-lg border border-gray-400 hover:border-white text-white font-medium text-xs transition-colors text-center"
          >
            Export All Records
          </a>
        </div>
      </div>
    </div>
  );
}
