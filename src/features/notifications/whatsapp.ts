import { connectToDatabase } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { Participant } from "@/models/Participant";
import { EVENT_CONFIG } from "@/config/event.config";

export interface SendWhatsAppParams {
  participantId: string;
  registrationId: string;
  recipientMobile: string;
  recipientName: string;
  qrCodeUrl?: string;
  passUrl?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  status: "sent" | "delivered" | "simulated" | "failed";
  providerMessageId?: string;
  error?: string;
}

/**
 * WhatsApp Cloud API service with automatic mock/simulation fallback when credentials are not configured.
 */
export async function sendWhatsAppConfirmation(
  params: SendWhatsAppParams
): Promise<WhatsAppSendResult> {
  const isEnabled = process.env.WHATSAPP_ENABLED === "true";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Clean and prepare recipient phone number (must be international without leading +)
  let recipient = params.recipientMobile.replace(/\D/g, "");
  if (recipient.length === 10) {
    recipient = "91" + recipient;
  }

  const messageText = EVENT_CONFIG.whatsappMessageTemplate;

  // If credentials are missing or explicitly disabled, run in SIMULATION / TEST mode
  if (!isEnabled || !accessToken || !phoneNumberId) {
    console.log(
      `[WhatsApp Simulator] Simulating WhatsApp message to ${recipient} for ${params.registrationId}`
    );

    try {
      await connectToDatabase();
      const simMessageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      await NotificationLog.create({
        participantId: params.participantId,
        registrationId: params.registrationId,
        type: "whatsapp",
        recipientMobile: recipient,
        status: "simulated",
        providerMessageId: simMessageId,
        attempts: 1,
        lastAttemptAt: new Date(),
        metadata: {
          simulated: true,
          mode: "development_mock",
          recipientName: params.recipientName,
          note: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local to enable live delivery",
        },
      });

      await Participant.findByIdAndUpdate(params.participantId, {
        whatsappStatus: "simulated",
        whatsappMessageId: simMessageId,
      });

      return {
        success: true,
        status: "simulated",
        providerMessageId: simMessageId,
      };
    } catch (err: any) {
      console.error("[WhatsApp Simulator Error]", err);
      return {
        success: false,
        status: "failed",
        error: err.message,
      };
    }
  }

  // Real WhatsApp Cloud API Call
  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body: messageText,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    await connectToDatabase();

    if (!res.ok) {
      const errorMsg = data?.error?.message || "WhatsApp API Error";
      console.error("[WhatsApp API Error]", data);

      await NotificationLog.create({
        participantId: params.participantId,
        registrationId: params.registrationId,
        type: "whatsapp",
        recipientMobile: recipient,
        status: "failed",
        errorMessage: errorMsg,
        attempts: 1,
        lastAttemptAt: new Date(),
        metadata: data,
      });

      await Participant.findByIdAndUpdate(params.participantId, {
        whatsappStatus: "failed",
      });

      return {
        success: false,
        status: "failed",
        error: errorMsg,
      };
    }

    const messageId = data?.messages?.[0]?.id || `wa_${Date.now()}`;

    await NotificationLog.create({
      participantId: params.participantId,
      registrationId: params.registrationId,
      type: "whatsapp",
      recipientMobile: recipient,
      status: "sent",
      providerMessageId: messageId,
      attempts: 1,
      lastAttemptAt: new Date(),
      metadata: data,
    });

    await Participant.findByIdAndUpdate(params.participantId, {
      whatsappStatus: "sent",
      whatsappMessageId: messageId,
    });

    return {
      success: true,
      status: "sent",
      providerMessageId: messageId,
    };
  } catch (err: any) {
    console.error("[WhatsApp Exception]", err);
    try {
      await connectToDatabase();
      await NotificationLog.create({
        participantId: params.participantId,
        registrationId: params.registrationId,
        type: "whatsapp",
        recipientMobile: recipient,
        status: "failed",
        errorMessage: err.message || "Network error",
        attempts: 1,
        lastAttemptAt: new Date(),
      });
      await Participant.findByIdAndUpdate(params.participantId, {
        whatsappStatus: "failed",
      });
    } catch {
      // Ignore fallback DB logging error
    }

    return {
      success: false,
      status: "failed",
      error: err.message,
    };
  }
}
