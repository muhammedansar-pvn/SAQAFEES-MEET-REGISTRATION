import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { AuditLog } from "@/models/AuditLog";
import { getSession } from "@/lib/auth";
import { normalizeMobileNumber } from "@/lib/phone";

export async function GET(
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

    const participant = await Participant.findOne({
      $or: [{ registrationId: id }, { _id: id }],
    }).select("-qrTokenHash");

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    return NextResponse.json({ participant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const participant = await Participant.findOne({
      $or: [{ registrationId: id }, { _id: id }],
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    const oldData = { ...participant.toObject() };

    if (body.name) participant.name = body.name.trim();
    if (body.place) participant.place = body.place.trim();
    if (typeof body.district === "string") participant.district = body.district.trim();
    if (typeof body.participateFully === "boolean") participant.participateFully = body.participateFully;
    if (typeof body.wantsFood === "boolean") participant.wantsFood = body.wantsFood;
    if (body.shuhba) participant.shuhba = body.shuhba;

    if (body.mobile) {
      const normalized = normalizeMobileNumber(body.mobile);
      // Check if new mobile clashes with another participant
      const existing = await Participant.findOne({
        normalizedMobile: normalized,
        _id: { $ne: participant._id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This mobile number is already used by another participant." },
          { status: 409 }
        );
      }
      participant.mobile = body.mobile.trim();
      participant.normalizedMobile = normalized;
    }

    if (typeof body.checkInStatus === "boolean") {
      participant.checkInStatus = body.checkInStatus;
      if (body.checkInStatus) {
        participant.checkedInAt = new Date();
        participant.checkedInBy = `${session.name} (Manual Update)`;
      } else {
        participant.checkedInAt = undefined;
        participant.checkedInBy = undefined;
      }
    }

    if (body.checkInNotes) {
      participant.checkInNotes = body.checkInNotes;
    }

    await participant.save();

    await AuditLog.create({
      action: "PARTICIPANT_UPDATE",
      performedBy: session.name,
      userEmail: session.email,
      targetId: participant.registrationId,
      details: {
        before: oldData,
        after: participant.toObject(),
      },
    });

    return NextResponse.json({ success: true, participant });
  } catch (error: any) {
    console.error("[Participant Update Error]", error);
    return NextResponse.json({ error: "Failed to update participant" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete participant records" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const participant = await Participant.findOneAndDelete({
      $or: [{ registrationId: id }, { _id: id }],
    });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    await AuditLog.create({
      action: "PARTICIPANT_DELETE",
      performedBy: session.name,
      userEmail: session.email,
      targetId: participant.registrationId,
      details: { name: participant.name, mobile: participant.mobile },
    });

    return NextResponse.json({ success: true, message: "Participant deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
