import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { EventSettings } from "@/models/EventSettings";
import { registrationSchema } from "@/lib/validations/registration";
import { normalizeMobileNumber } from "@/lib/phone";
import {
  generateRegistrationId,
  generateSecureVerificationToken,
  hashVerificationToken,
  generatePassAccessToken,
} from "@/lib/token";
import { rateLimit } from "@/lib/rate-limit";
import { sendWhatsAppConfirmation } from "@/features/notifications/whatsapp";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting (15 registration submissions per minute per IP)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const limiter = rateLimit(`reg_${ip}`, 15, 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait a moment before trying again.",
        },
        { status: 429 }
      );
    }

    // 2. Body parsing and Zod validation
    const rawBody = await req.json();
    const parseResult = registrationSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError =
        parseResult.error.issues?.[0]?.message ||
        parseResult.error.message ||
        "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, place, mobile, shuhba, whatsappConsent = true } = parseResult.data;
    const normalizedMobile = normalizeMobileNumber(mobile);

    await connectToDatabase();

    // 3. Check if registration is open in EventSettings
    const settings = await EventSettings.findOne();
    if (settings && settings.isRegistrationOpen === false) {
      return NextResponse.json(
        {
          error: "Registration is currently closed by the administration.",
        },
        { status: 403 }
      );
    }

    // 4. Duplicate Check by normalized mobile number
    const existing = await Participant.findOne({ normalizedMobile });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "This mobile number is already registered. You can view or download your existing pass.",
          isDuplicate: true,
          existingRegistrationId: existing.registrationId,
          passAccessToken: existing.passAccessToken,
        },
        { status: 409 }
      );
    }

    // 5. Generate secure identities
    const registrationId = generateRegistrationId();
    const rawVerificationToken = generateSecureVerificationToken();
    const qrTokenHash = hashVerificationToken(rawVerificationToken);
    const passAccessToken = generatePassAccessToken();

    // 6. Save participant record
    const participant = await Participant.create({
      registrationId,
      name,
      place,
      mobile,
      normalizedMobile,
      shuhba,
      qrTokenHash,
      passAccessToken,
      checkInStatus: false,
      whatsappConsent,
      whatsappStatus: "pending",
    });

    // 7. Fire WhatsApp notification in background (non-blocking)
    sendWhatsAppConfirmation({
      participantId: participant._id.toString(),
      registrationId: participant.registrationId,
      recipientMobile: participant.mobile,
      recipientName: participant.name,
    }).catch((err) => console.error("[WhatsApp Trigger Error]", err));

    return NextResponse.json(
      {
        success: true,
        registrationId,
        passAccessToken,
        rawVerificationToken,
        participant: {
          id: participant._id.toString(),
          registrationId: participant.registrationId,
          name: participant.name,
          place: participant.place,
          mobile: participant.mobile,
          shuhba: participant.shuhba,
          checkInStatus: participant.checkInStatus,
          createdAt: participant.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle MongoDB duplicate key error code 11000
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error: "This mobile number is already registered.",
          isDuplicate: true,
        },
        { status: 409 }
      );
    }

    console.error("[Registration API Error]", error);
    return NextResponse.json(
      {
        error: "Registration failed due to a server error. Please try again.",
      },
      { status: 500 }
    );
  }
}
