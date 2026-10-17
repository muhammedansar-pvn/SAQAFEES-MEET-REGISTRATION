import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const shuhba = searchParams.get("shuhba")?.trim() || "";
    const district = searchParams.get("district")?.trim() || "";
    const checkIn = searchParams.get("checkIn")?.trim() || "";
    const participateFully = searchParams.get("participateFully")?.trim() || "";
    const wantsFood = searchParams.get("wantsFood")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(2000, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const query: any = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { registrationId: searchRegex },
        { place: searchRegex },
        { district: searchRegex },
        { mobile: searchRegex },
        { normalizedMobile: searchRegex },
      ];
    }

    if (shuhba && shuhba !== "ALL") {
      query.shuhba = shuhba;
    }

    if (district && district !== "ALL") {
      query.district = new RegExp(`^${district}$`, "i");
    }

    if (checkIn === "checkedIn") {
      query.checkInStatus = true;
    } else if (checkIn === "notCheckedIn") {
      query.checkInStatus = false;
    }

    if (participateFully === "yes") {
      query.participateFully = true;
    } else if (participateFully === "no") {
      query.participateFully = false;
    }

    if (wantsFood === "yes") {
      query.wantsFood = true;
    } else if (wantsFood === "no") {
      query.wantsFood = false;
    }

    const [participants, total, overallTotal] = await Promise.all([
      Participant.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-qrTokenHash"),
      Participant.countDocuments(query),
      Participant.countDocuments({}),
    ]);

    return NextResponse.json({
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      overallTotal,
    });
  } catch (error: any) {
    console.error("[Admin Participants List Error]", error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}
