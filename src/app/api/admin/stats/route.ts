import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { getSession } from "@/lib/auth";
import { EVENT_CONFIG } from "@/config/event.config";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Overall counts
    const totalRegistrations = await Participant.countDocuments();
    const checkedInCount = await Participant.countDocuments({ checkInStatus: true });
    const notCheckedInCount = totalRegistrations - checkedInCount;
    const checkInRate =
      totalRegistrations > 0
        ? Math.round((checkedInCount / totalRegistrations) * 100)
        : 0;

    // 2. Shuhba-wise distribution
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

    const shuhbaStats: Record<
      string,
      { total: number; checkedIn: number; percentage: number }
    > = {};
    EVENT_CONFIG.shuhbaOptions.forEach((shuhba) => {
      shuhbaStats[shuhba] = { total: 0, checkedIn: 0, percentage: 0 };
    });

    shuhbaAggregation.forEach((item) => {
      if (item._id && shuhbaStats[item._id]) {
        const total = item.count;
        const percentage =
          totalRegistrations > 0 ? Math.round((total / totalRegistrations) * 100) : 0;
        shuhbaStats[item._id] = {
          total,
          checkedIn: item.checkedIn,
          percentage,
        };
      }
    });

    // 3. WhatsApp statistics
    const whatsappAggregation = await Participant.aggregate([
      {
        $group: {
          _id: "$whatsappStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const whatsappStats: Record<string, number> = {
      pending: 0,
      sent: 0,
      delivered: 0,
      simulated: 0,
      failed: 0,
    };

    whatsappAggregation.forEach((item) => {
      if (item._id && whatsappStats[item._id] !== undefined) {
        whatsappStats[item._id] = item.count;
      }
    });

    // 4. Recent activity
    const recentRegistrations = await Participant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("registrationId name place shuhba createdAt checkInStatus");

    const recentCheckIns = await Participant.find({ checkInStatus: true })
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
      whatsappStats,
      recentRegistrations,
      recentCheckIns,
    });
  } catch (error: any) {
    console.error("[Admin Stats Error]", error);
    return NextResponse.json({ error: "Failed to load statistics" }, { status: 500 });
  }
}
