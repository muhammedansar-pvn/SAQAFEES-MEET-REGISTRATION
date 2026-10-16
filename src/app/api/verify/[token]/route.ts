import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { hashVerificationToken } from "@/lib/token";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    await connectToDatabase();

    // The QR code contains the raw token or hash
    const tokenHash = hashVerificationToken(token);

    // Query either by direct hash or in case the URL was encoded with the hash
    const participant = await Participant.findOne({
      $or: [{ qrTokenHash: tokenHash }, { qrTokenHash: token }],
    });

    if (!participant) {
      return NextResponse.json(
        {
          isValid: false,
          error: "Invalid or Revoked Pass",
        },
        { status: 404 }
      );
    }

    const session = await getSession();

    return NextResponse.json({
      isValid: true,
      registrationId: participant.registrationId,
      name: participant.name,
      shuhba: participant.shuhba,
      place: participant.place,
      checkInStatus: participant.checkInStatus,
      checkedInAt: participant.checkedInAt,
      checkedInBy: participant.checkedInBy,
      canCheckIn: !!session,
    });
  } catch (error: any) {
    console.error("[Verification API Error]", error);
    return NextResponse.json({ error: "Server error during verification" }, { status: 500 });
  }
}
