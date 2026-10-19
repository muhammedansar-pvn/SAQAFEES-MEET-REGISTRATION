import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { getSession } from "@/lib/auth";
import { EVENT_CONFIG } from "@/config/event.config";
import { calculateDepartmentProgress } from "@/features/departments/progress";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    await connectToDatabase();

    // Exclude cancelled or invalid registrations according to registration status rules
    const validFilter = {
      $or: [
        { status: { $exists: false } },
        { status: { $nin: ["cancelled", "invalid", "rejected"] } },
      ],
    };

    // 1. Overall counts
    const totalRegistrations = await Participant.countDocuments(validFilter);
    const checkedInCount = await Participant.countDocuments({
      ...validFilter,
      checkInStatus: true,
    });
    const notCheckedInCount = totalRegistrations - checkedInCount;
    const checkInRate =
      totalRegistrations > 0
        ? Math.round((checkedInCount / totalRegistrations) * 100)
        : 0;

    // 2. Shuhba-wise distribution aggregation
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

    // 3. Calculate department targets, remaining, completion percentage, and sorted list
    const { departments: departmentProgress, overall: overallProgress } =
      calculateDepartmentProgress(shuhbaAggregation);

    // Legacy map compatibility for existing consumers
    const shuhbaStats: Record<
      string,
      {
        total: number;
        checkedIn: number;
        percentage: number;
        target: number;
        remaining: number;
        completionPercentage: number;
        visualPercentage: number;
      }
    > = {};

    EVENT_CONFIG.shuhbaOptions.forEach((shuhba) => {
      const match = departmentProgress.find((d) => d.code === shuhba);
      shuhbaStats[shuhba] = {
        total: match?.registeredCount ?? 0,
        checkedIn: match?.checkedInCount ?? 0,
        percentage: match?.completionPercentage ?? 0,
        target: match?.target ?? 0,
        remaining: match?.remaining ?? 0,
        completionPercentage: match?.completionPercentage ?? 0,
        visualPercentage: match?.visualPercentage ?? 0,
      };
    });

    // 4. Recent activity
    const recentRegistrations = await Participant.find(validFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("registrationId name place shuhba createdAt checkInStatus");

    const recentCheckIns = await Participant.find({ ...validFilter, checkInStatus: true })
      .sort({ checkedInAt: -1 })
      .limit(5)
      .select("registrationId name shuhba checkedInAt checkedInBy");

    return NextResponse.json({
      summary: {
        totalRegistrations,
        checkedInCount,
        notCheckedInCount,
        checkInRate,
      },
      shuhbaStats,
      departmentProgress,
      overallProgress,
      recentRegistrations,
      recentCheckIns,
    });
  } catch (error: any) {
    console.error("[Admin Stats Error]", error);
    return NextResponse.json({ error: "Failed to load statistics" }, { status: 500 });
  }
}
