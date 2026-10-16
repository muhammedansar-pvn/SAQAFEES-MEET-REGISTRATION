import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { normalizeMobileNumber, isValidMobileNumber } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Rate limit lookup attempts
    const limiter = rateLimit(`lookup_${ip}`, 10, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const { mobile } = await req.json();

    if (!mobile || !isValidMobileNumber(mobile)) {
      return NextResponse.json(
        { error: "Enter a valid mobile number" },
        { status: 400 }
      );
    }

    const normalizedMobile = normalizeMobileNumber(mobile);
    await connectToDatabase();

    const participant = await Participant.findOne({ normalizedMobile });

    if (!participant) {
      return NextResponse.json(
        {
          error: "No registration found for this mobile number.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      registrationId: participant.registrationId,
      passAccessToken: participant.passAccessToken,
    });
  } catch (error: any) {
    console.error("[Lookup API Error]", error);
    return NextResponse.json(
      { error: "Unable to retrieve registration details at this time." },
      { status: 500 }
    );
  }
}
