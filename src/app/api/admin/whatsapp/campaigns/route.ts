import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { WhatsAppCampaign } from "@/models/WhatsAppCampaign";
import { AuditLog } from "@/models/AuditLog";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    await connectToDatabase();

    const campaigns = await WhatsAppCampaign.find()
      .sort({ updatedAt: -1 })
      .limit(30)
      .select("-participants.notes");

    // Add aggregate statistics for each campaign
    const summaries = campaigns.map((c) => {
      const stats = {
        total: c.totalCount,
        pending: 0,
        opened: 0,
        markedSent: 0,
        skipped: 0,
        failedToOpen: 0,
      };

      c.participants.forEach((p) => {
        if (p.status === "PENDING") stats.pending++;
        else if (p.status === "OPENED") stats.opened++;
        else if (p.status === "MARKED_SENT") stats.markedSent++;
        else if (p.status === "SKIPPED") stats.skipped++;
        else if (p.status === "FAILED_TO_OPEN") stats.failedToOpen++;
      });

      return {
        _id: c._id,
        title: c.title,
        templateType: c.templateType,
        status: c.status,
        currentIndex: c.currentIndex,
        totalCount: c.totalCount,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        stats,
      };
    });

    return NextResponse.json({ campaigns: summaries });
  } catch (error: any) {
    console.error("[Get WhatsApp Campaigns Error]", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { title, templateType, messageTemplate, participantIds } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Campaign title is required." }, { status: 400 });
    }

    if (!messageTemplate || typeof messageTemplate !== "string") {
      return NextResponse.json({ error: "Message template content is required." }, { status: 400 });
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one participant." },
        { status: 400 }
      );
    }

    // STRICT 500 PARTICIPANT LIMIT ENFORCEMENT
    if (participantIds.length > 500) {
      return NextResponse.json(
        {
          error: `Selection limit exceeded. Maximum 500 participants allowed per campaign (selected: ${participantIds.length}).`,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Fetch participants from database in order
    const participants = await Participant.find({
      _id: { $in: participantIds },
    }).select("name mobile normalizedMobile place district shuhba registrationId passAccessToken");

    if (participants.length === 0) {
      return NextResponse.json(
        { error: "No matching participants found for selected IDs." },
        { status: 404 }
      );
    }

    // Map into campaign participant structure
    const campaignParticipants = participants.map((p) => ({
      participantId: p._id,
      registrationId: p.registrationId,
      name: p.name,
      mobile: p.mobile,
      normalizedMobile: p.normalizedMobile || p.mobile.replace(/\D/g, ""),
      place: p.place || "",
      district: p.district || "",
      department: p.shuhba,
      passAccessToken: p.passAccessToken,
      status: "PENDING" as const,
    }));

    const campaign = await WhatsAppCampaign.create({
      title: title.trim(),
      templateType: templateType || "custom",
      messageTemplate,
      status: "in_progress",
      createdBy: session.name || session.email || "admin",
      totalCount: campaignParticipants.length,
      currentIndex: 0,
      participants: campaignParticipants,
    });

    await AuditLog.create({
      action: "WHATSAPP_CAMPAIGN_CREATED",
      performedBy: session.name || session.email || "admin",
      userEmail: session.email,
      targetId: campaign._id.toString(),
      details: {
        campaignTitle: campaign.title,
        templateType: campaign.templateType,
        totalParticipants: campaign.totalCount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        campaignId: campaign._id,
        campaign: {
          _id: campaign._id,
          title: campaign.title,
          totalCount: campaign.totalCount,
          currentIndex: campaign.currentIndex,
          status: campaign.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Create WhatsApp Campaign Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create campaign" },
      { status: 500 }
    );
  }
}
