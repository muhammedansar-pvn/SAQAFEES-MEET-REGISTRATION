import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WhatsAppCampaign } from "@/models/WhatsAppCampaign";
import { NotificationLog } from "@/models/NotificationLog";
import { Participant } from "@/models/Participant";
import { AuditLog } from "@/models/AuditLog";
import { getSession } from "@/lib/auth";

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

    const campaign = await WhatsAppCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Calculate live progress breakdown
    const stats = {
      total: campaign.totalCount,
      pending: 0,
      opened: 0,
      markedSent: 0,
      skipped: 0,
      failedToOpen: 0,
    };

    campaign.participants.forEach((p) => {
      if (p.status === "PENDING") stats.pending++;
      else if (p.status === "OPENED") stats.opened++;
      else if (p.status === "MARKED_SENT") stats.markedSent++;
      else if (p.status === "SKIPPED") stats.skipped++;
      else if (p.status === "FAILED_TO_OPEN") stats.failedToOpen++;
    });

    return NextResponse.json({ campaign, stats });
  } catch (error: any) {
    console.error("[Get Campaign Error]", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
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

    const campaign = await WhatsAppCampaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // 1. Update overall campaign status / index
    if (body.status && ["draft", "in_progress", "paused", "completed"].includes(body.status)) {
      campaign.status = body.status;
    }

    if (typeof body.currentIndex === "number") {
      campaign.currentIndex = Math.max(0, Math.min(body.currentIndex, campaign.participants.length - 1));
    }

    if (body.messageTemplate && typeof body.messageTemplate === "string") {
      campaign.messageTemplate = body.messageTemplate;
    }

    // 2. Update specific participant status
    if (body.participantAction) {
      const { participantId, status, notes } = body.participantAction;
      const target = campaign.participants.find(
        (p) => p.participantId.toString() === participantId || p.registrationId === participantId
      );

      if (target) {
        target.status = status;
        if (notes !== undefined) target.notes = notes;

        if (status === "OPENED") {
          target.openedAt = new Date();
        } else if (status === "MARKED_SENT") {
          target.markedAt = new Date();

          // Log in NotificationLog to track messaging history
          await NotificationLog.create({
            participantId: target.participantId,
            registrationId: target.registrationId,
            type: "whatsapp",
            recipientMobile: target.normalizedMobile,
            status: "sent",
            templateName: `click_to_chat_${campaign.templateType}`,
            attempts: 1,
            lastAttemptAt: new Date(),
            metadata: {
              manualClickToChat: true,
              campaignId: campaign._id,
              campaignTitle: campaign.title,
              recordedBy: session.email,
              note: "Marked as sent by administrator via Click-to-Chat",
            },
          });

          // Update participant's whatsappStatus if pending or failed
          await Participant.findByIdAndUpdate(target.participantId, {
            $set: {
              whatsappStatus: "sent",
              whatsappMessageId: `c2c_${campaign._id}_${Date.now()}`,
            },
          });
        }
      }
    }

    // Check if campaign is now completed
    const allProcessed = campaign.participants.every((p) => p.status !== "PENDING");
    if (allProcessed && campaign.status === "in_progress") {
      campaign.status = "completed";
    }

    await campaign.save();

    return NextResponse.json({
      success: true,
      currentIndex: campaign.currentIndex,
      status: campaign.status,
    });
  } catch (error: any) {
    console.error("[Update Campaign Error]", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const campaign = await WhatsAppCampaign.findByIdAndDelete(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await AuditLog.create({
      action: "WHATSAPP_CAMPAIGN_DELETED",
      performedBy: session.name || session.email || "admin",
      userEmail: session.email,
      targetId: id,
      details: {
        campaignTitle: campaign.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Campaign Error]", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
