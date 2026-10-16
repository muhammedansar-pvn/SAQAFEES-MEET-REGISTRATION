import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EventSettings } from "@/models/EventSettings";
import { AuditLog } from "@/models/AuditLog";
import { getSession } from "@/lib/auth";
import { EVENT_CONFIG } from "@/config/event.config";

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await EventSettings.findOne();
    if (!settings) {
      settings = await EventSettings.create({
        isRegistrationOpen: true,
        eventTitle: EVENT_CONFIG.name,
        eventSubtitle: EVENT_CONFIG.subtitle,
        eventDate: EVENT_CONFIG.dateFormatted,
        eventTime: EVENT_CONFIG.timeFormatted,
        venue: EVENT_CONFIG.venue,
        shuhbaOptions: [...EVENT_CONFIG.shuhbaOptions],
        whatsappMessageTemplate: EVENT_CONFIG.whatsappMessageTemplate,
        contactPhone: EVENT_CONFIG.contact.phone,
        contactEmail: EVENT_CONFIG.contact.email,
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can update event settings." },
        { status: 403 }
      );
    }

    const body = await req.json();
    await connectToDatabase();

    let settings = await EventSettings.findOne();
    if (!settings) {
      settings = new EventSettings();
    }

    if (typeof body.isRegistrationOpen === "boolean") {
      settings.isRegistrationOpen = body.isRegistrationOpen;
    }
    if (body.contactPhone) settings.contactPhone = body.contactPhone;
    if (body.contactEmail) settings.contactEmail = body.contactEmail;
    if (body.whatsappMessageTemplate) {
      settings.whatsappMessageTemplate = body.whatsappMessageTemplate;
    }
    if (Array.isArray(body.shuhbaOptions) && body.shuhbaOptions.length > 0) {
      settings.shuhbaOptions = body.shuhbaOptions;
    }

    await settings.save();

    await AuditLog.create({
      action: "SETTINGS_UPDATE",
      performedBy: session.name,
      userEmail: session.email,
      details: body,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
