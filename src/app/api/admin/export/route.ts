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
    const shuhba = searchParams.get("shuhba");
    const checkIn = searchParams.get("checkIn");

    await connectToDatabase();

    const query: any = {};
    if (shuhba && shuhba !== "ALL") query.shuhba = shuhba;
    if (checkIn === "checkedIn") query.checkInStatus = true;
    if (checkIn === "notCheckedIn") query.checkInStatus = false;

    const participants = await Participant.find(query).sort({ createdAt: -1 });

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const text = String(str).replace(/"/g, '""');
      return `"${text}"`;
    };

    const headers = [
      "Registration ID",
      "Name",
      "Place",
      "District",
      "Mobile",
      "Shuhba",
      "Participate Fully",
      "Wants Food",
      "Check-in Status",
      "Checked-in At",
      "Checked-in By",
      "WhatsApp Status",
      "Registered At",
    ];

    const rows = participants.map((p) => [
      escapeCsv(p.registrationId),
      escapeCsv(p.name),
      escapeCsv(p.place),
      escapeCsv(p.district || ""),
      escapeCsv(p.mobile),
      escapeCsv(p.shuhba),
      escapeCsv(p.participateFully !== false ? "Yes" : "No"),
      escapeCsv(p.wantsFood !== false ? "Yes" : "No"),
      escapeCsv(p.checkInStatus ? "Checked In" : "Pending"),
      escapeCsv(p.checkedInAt ? p.checkedInAt.toISOString() : ""),
      escapeCsv(p.checkedInBy || ""),
      escapeCsv(p.whatsappStatus),
      escapeCsv(p.createdAt.toISOString()),
    ]);

    const csvContent =
      "\uFEFF" + // UTF-8 BOM for Excel display compatibility
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="saqafees-participants-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[CSV Export Error]", error);
    return NextResponse.json({ error: "Failed to generate CSV export" }, { status: 500 });
  }
}
