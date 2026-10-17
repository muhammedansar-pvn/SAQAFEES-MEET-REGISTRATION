import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { AuditLog } from "@/models/AuditLog";
import { getSession } from "@/lib/auth";
import { sendWhatsAppConfirmation } from "@/features/notifications/whatsapp";

function getParticipantQuery(id: string) {
  const trimmed = id.trim();
  if (mongoose.Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
    return { $or: [{ registrationId: trimmed }, { _id: trimmed }] };
  }
  return { registrationId: trimmed };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const participant = await Participant.findOne(getParticipantQuery(id));
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const baseUrl =
      req.nextUrl?.origin ||
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const result = await sendWhatsAppConfirmation({
      participantId: participant._id.toString(),
      registrationId: participant.registrationId,
      recipientMobile: participant.mobile,
      recipientName: participant.name,
      place: participant.place,
      district: participant.district,
      department: participant.shuhba,
      participateFully: participant.participateFully,
      wantsFood: participant.wantsFood,
      passAccessToken: participant.passAccessToken,
      baseUrl,
      forceResend: true,
    });

    await AuditLog.create({
      action: "MANUAL_OVERRIDE",
      performedBy: session.name || session.email || "admin",
      userEmail: session.email,
      targetId: participant.registrationId,
      details: {
        note: `Manually triggered WhatsApp confirmation resend. Result: ${result.status}`,
        result,
      },
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      providerMessageId: result.providerMessageId,
      error: result.error,
    });
  } catch (error: any) {
    console.error("[Resend WhatsApp Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend WhatsApp confirmation" },
      { status: 500 }
    );
  }
}
