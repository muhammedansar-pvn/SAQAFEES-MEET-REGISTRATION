import { NextRequest, NextResponse } from "next/server";
import { generateIcsContent } from "@/features/calendar/generator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regId = searchParams.get("regId") || undefined;

  const icsBody = generateIcsContent(regId);

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="saqafees-meet-2026.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
