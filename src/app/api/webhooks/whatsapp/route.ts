import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { Participant } from "@/models/Participant";

/**
 * Webhook Verification for Meta / WhatsApp Cloud API
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedVerifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "saqafees_webhook_verify_token_2026";

  if (mode === "subscribe" && token === expectedVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden verification token" }, { status: 403 });
}

/**
 * Webhook event updates (delivery, read, failed)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Standard WhatsApp Cloud API payload format
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses;

    if (statuses && Array.isArray(statuses) && statuses.length > 0) {
      await connectToDatabase();

      for (const item of statuses) {
        const messageId = item.id;
        const status = item.status; // 'sent' | 'delivered' | 'read' | 'failed'

        let mappedStatus: "sent" | "delivered" | "failed" = "sent";
        if (status === "delivered" || status === "read") {
          mappedStatus = "delivered";
        } else if (status === "failed") {
          mappedStatus = "failed";
        }

        // Update NotificationLog
        await NotificationLog.findOneAndUpdate(
          { providerMessageId: messageId },
          {
            $set: {
              status: mappedStatus,
              lastAttemptAt: new Date(),
              metadata: item,
            },
          }
        );

        // Update Participant record
        await Participant.findOneAndUpdate(
          { whatsappMessageId: messageId },
          {
            $set: {
              whatsappStatus: mappedStatus,
            },
          }
        );
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]", error);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
