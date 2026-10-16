import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { AuditLog } from "@/models/AuditLog";
import { getSession } from "@/lib/auth";
import { hashVerificationToken } from "@/lib/token";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Staff authentication required to perform check-in" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { registrationId, qrToken, isOverride = false, overrideNotes } = body;

    if (!registrationId && !qrToken) {
      return NextResponse.json(
        { error: "Registration ID or QR token is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the participant first
    let query: any = {};
    if (registrationId) {
      query.registrationId = registrationId.trim().toUpperCase();
    } else if (qrToken) {
      const tokenHash = hashVerificationToken(qrToken);
      query.$or = [{ qrTokenHash: tokenHash }, { qrTokenHash: qrToken }];
    }

    const participant = await Participant.findOne(query);

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    const staffIdentifier = `${session.name} (${session.email})`;

    // Check if already checked in
    if (participant.checkInStatus) {
      if (!isOverride) {
        return NextResponse.json(
          {
            error: "This pass has already been checked in.",
            alreadyCheckedIn: true,
            participant: {
              registrationId: participant.registrationId,
              name: participant.name,
              place: participant.place,
              shuhba: participant.shuhba,
              checkedInAt: participant.checkedInAt,
              checkedInBy: participant.checkedInBy,
            },
          },
          { status: 409 }
        );
      }

      // Admin Override workflow
      if (session.role !== "admin") {
        return NextResponse.json(
          { error: "Only administrators are permitted to perform check-in overrides." },
          { status: 403 }
        );
      }

      participant.checkedInAt = new Date();
      participant.checkedInBy = `${staffIdentifier} [OVERRIDE]`;
      participant.checkInNotes = overrideNotes || "Manual Admin Override";
      await participant.save();

      await AuditLog.create({
        action: "CHECKIN_OVERRIDE",
        performedBy: staffIdentifier,
        userEmail: session.email,
        targetId: participant.registrationId,
        details: { overrideNotes },
      });

      return NextResponse.json({
        success: true,
        message: "Check-in override recorded successfully",
        participant: {
          registrationId: participant.registrationId,
          name: participant.name,
          place: participant.place,
          shuhba: participant.shuhba,
          checkInStatus: true,
          checkedInAt: participant.checkedInAt,
          checkedInBy: participant.checkedInBy,
        },
      });
    }

    // ATOMIC database update to prevent race conditions & concurrent scans
    const updated = await Participant.findOneAndUpdate(
      {
        _id: participant._id,
        checkInStatus: false, // Ensures atomic single-scan check
      },
      {
        $set: {
          checkInStatus: true,
          checkedInAt: new Date(),
          checkedInBy: staffIdentifier,
        },
      },
      { new: true }
    );

    if (!updated) {
      // Concurrently updated by another staff member
      return NextResponse.json(
        {
          error: "Concurrent check-in detected. Participant was already checked in.",
          alreadyCheckedIn: true,
        },
        { status: 409 }
      );
    }

    // Log in AuditLog
    await AuditLog.create({
      action: "CHECKIN_SUCCESS",
      performedBy: staffIdentifier,
      userEmail: session.email,
      targetId: updated.registrationId,
      details: {
        registrationId: updated.registrationId,
        name: updated.name,
        shuhba: updated.shuhba,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Check-in successful",
      participant: {
        registrationId: updated.registrationId,
        name: updated.name,
        place: updated.place,
        shuhba: updated.shuhba,
        checkInStatus: true,
        checkedInAt: updated.checkedInAt,
        checkedInBy: updated.checkedInBy,
      },
    });
  } catch (error: any) {
    console.error("[Check-in API Error]", error);
    return NextResponse.json({ error: "Check-in processing error" }, { status: 500 });
  }
}
