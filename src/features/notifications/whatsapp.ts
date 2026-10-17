import { connectToDatabase } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { Participant } from "@/models/Participant";
import { normalizeMobileNumber, isValidMobileNumber } from "@/lib/phone";

export interface SendWhatsAppParams {
  participantId: string;
  registrationId: string;
  recipientMobile: string;
  recipientName: string;
  place?: string;
  district?: string;
  department?: string;
  participateFully?: boolean;
  wantsFood?: boolean;
  passAccessToken?: string;
  entryPassUrl?: string;
  baseUrl?: string;
  forceResend?: boolean;
}

export interface WhatsAppSendResult {
  success: boolean;
  status: "sent" | "delivered" | "simulated" | "failed";
  providerMessageId?: string;
  error?: string;
}

/**
 * Builds the official WhatsApp confirmation message template.
 */
export function buildWhatsAppConfirmationMessage(params: {
  name: string;
  place: string;
  district: string;
  department: string;
  participateFully: boolean;
  wantsFood: boolean;
  registrationId: string;
  entryPassUrl: string;
}): string {
  return `*Assalamu Alaikum!*

Your registration for *لقاء — 2025 Saqafees Meet* has been completed successfully.

*Registration Details*
- Name: ${params.name}
- Place: ${params.place || "N/A"}
- District: ${params.district || "N/A"}
- Department: ${params.department || "N/A"}
- Participation: ${params.participateFully ? "Yes" : "No"}
- Food Required: ${params.wantsFood ? "Yes" : "No"}
- Registration ID: ${params.registrationId}

*Event Details*
- Date: Saturday, 21 November 2026
- Time: 10:00 AM – 2:00 PM
- Venue: Markaz

Your entry pass is available here:
${params.entryPassUrl}

Please keep your entry pass ready when you arrive.

We look forward to welcoming you!`;
}

/**
 * Send WhatsApp confirmation using Meta WhatsApp Business Cloud API.
 * Features:
 * - Duplicate prevention (idempotency check)
 * - Safe retry handling with exponential backoff for temporary failures
 * - Safe mock/simulation fallback when credentials are not configured
 * - Audit logging in NotificationLog and Participant records
 */
export async function sendWhatsAppConfirmation(
  params: SendWhatsAppParams
): Promise<WhatsAppSendResult> {
  const isEnabled = process.env.WHATSAPP_ENABLED === "true";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en";

  await connectToDatabase();

  // 1. Fetch participant record
  const participant = await Participant.findById(params.participantId);
  if (!participant) {
    return {
      success: false,
      status: "failed",
      error: "Participant record not found in database",
    };
  }

  // 2. Idempotency Check: Prevent duplicate sends on page refresh or retry
  if (!params.forceResend && (participant.whatsappStatus === "sent" || participant.whatsappStatus === "delivered")) {
    console.log(
      `[WhatsApp Idempotency] Message already sent/delivered for ${params.registrationId}. Skipping duplicate.`
    );
    return {
      success: true,
      status: participant.whatsappStatus,
      providerMessageId: participant.whatsappMessageId,
    };
  }

  // 3. Consent check: Ensure participant consented to WhatsApp messages
  if (participant.whatsappConsent === false) {
    console.log(`[WhatsApp] Participant ${params.registrationId} opted out of WhatsApp messages.`);
    return {
      success: true,
      status: "simulated",
      error: "User did not consent to WhatsApp notification",
    };
  }

  // 4. Validate & format recipient phone number (international without leading +)
  const normalized = normalizeMobileNumber(params.recipientMobile || participant.mobile);
  if (!isValidMobileNumber(params.recipientMobile || participant.mobile) || !normalized) {
    const errorMsg = "Invalid recipient phone number format.";
    console.warn(`[WhatsApp Error] ${errorMsg} for ${params.recipientMobile}`);

    await Participant.findByIdAndUpdate(params.participantId, {
      whatsappStatus: "failed",
    });

    await NotificationLog.create({
      participantId: params.participantId,
      registrationId: params.registrationId,
      type: "whatsapp",
      recipientMobile: params.recipientMobile || participant.mobile,
      status: "failed",
      errorMessage: errorMsg,
      attempts: 1,
      lastAttemptAt: new Date(),
    });

    return {
      success: false,
      status: "failed",
      error: errorMsg,
    };
  }

  const recipient = normalized; // E.g. "919876543210"

  // 5. Build Entry Pass URL
  const baseUrl = (
    params.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://saqafees-meet.vercel.app"
  ).replace(/\/$/, "");

  const passToken = params.passAccessToken || participant.passAccessToken;
  const entryPassUrl =
    params.entryPassUrl ||
    `${baseUrl}/confirmation/${params.registrationId}?token=${passToken}`;

  // 6. Build Message Content
  const messageText = buildWhatsAppConfirmationMessage({
    name: params.recipientName || participant.name,
    place: params.place ?? participant.place,
    district: params.district ?? participant.district,
    department: params.department ?? participant.shuhba,
    participateFully: params.participateFully ?? participant.participateFully,
    wantsFood: params.wantsFood ?? participant.wantsFood,
    registrationId: params.registrationId || participant.registrationId,
    entryPassUrl,
  });

  // 7. SIMULATION / TEST MODE (When disabled or credentials not provided)
  if (!isEnabled || !accessToken || !phoneNumberId) {
    const simMessageId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(
      `[WhatsApp Simulator] Sending simulated WhatsApp message to +${recipient} for ${params.registrationId}`
    );

    try {
      await NotificationLog.create({
        participantId: params.participantId,
        registrationId: params.registrationId,
        type: "whatsapp",
        recipientMobile: recipient,
        status: "simulated",
        providerMessageId: simMessageId,
        templateName: templateName || "direct_text_message",
        attempts: 1,
        lastAttemptAt: new Date(),
        metadata: {
          simulated: true,
          mode: "development_mock",
          recipientName: params.recipientName || participant.name,
          messagePreview: messageText,
          entryPassUrl,
          note: "Set WHATSAPP_ENABLED=true, WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in production for live Meta API delivery",
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

  // 8. LIVE META WHATSAPP BUSINESS CLOUD API CALL WITH SAFE RETRY
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  // Payload: If approved template name is configured, use template; otherwise, send text
  const textPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: true,
      body: messageText,
    },
  };

  const templatePayload = templateName
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: params.recipientName || participant.name },
                { type: "text", text: params.place ?? participant.place ?? "N/A" },
                { type: "text", text: params.district ?? participant.district ?? "N/A" },
                { type: "text", text: params.department ?? participant.shuhba ?? "N/A" },
                {
                  type: "text",
                  text: (params.participateFully ?? participant.participateFully) ? "Yes" : "No",
                },
                {
                  type: "text",
                  text: (params.wantsFood ?? participant.wantsFood) ? "Yes" : "No",
                },
                { type: "text", text: params.registrationId || participant.registrationId },
                { type: "text", text: entryPassUrl },
              ],
            },
          ],
        },
      }
    : null;

  let attempt = 0;
  const maxAttempts = 2; // initial + 1 retry for temporary errors
  let lastError = "";
  let responseData: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const activePayload = templatePayload || textPayload;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activePayload),
      });

      responseData = await res.json();

      if (res.ok && responseData?.messages?.[0]?.id) {
        const messageId = responseData.messages[0].id;

        await NotificationLog.create({
          participantId: params.participantId,
          registrationId: params.registrationId,
          type: "whatsapp",
          recipientMobile: recipient,
          status: "sent",
          providerMessageId: messageId,
          templateName: templateName || "direct_text_message",
          attempts: attempt,
          lastAttemptAt: new Date(),
          metadata: responseData,
        });

        // Mark as sent in Participant (NOT delivered; delivered is set by incoming webhook)
        await Participant.findByIdAndUpdate(params.participantId, {
          whatsappStatus: "sent",
          whatsappMessageId: messageId,
        });

        console.log(`[WhatsApp Success] Message sent to +${recipient} (ID: ${messageId})`);

        return {
          success: true,
          status: "sent",
          providerMessageId: messageId,
        };
      }

      // Check for template fallback if template failed because it doesn't exist
      if (!res.ok && templatePayload && responseData?.error?.code === 132000) {
        console.warn("[WhatsApp Notice] Template not found in Meta, falling back to direct text...");
        const fallbackRes = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(textPayload),
        });
        responseData = await fallbackRes.json();
        if (fallbackRes.ok && responseData?.messages?.[0]?.id) {
          const messageId = responseData.messages[0].id;
          await NotificationLog.create({
            participantId: params.participantId,
            registrationId: params.registrationId,
            type: "whatsapp",
            recipientMobile: recipient,
            status: "sent",
            providerMessageId: messageId,
            templateName: "direct_text_fallback",
            attempts: attempt,
            lastAttemptAt: new Date(),
            metadata: responseData,
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
        }
      }

      // Non-OK response from Meta
      lastError = responseData?.error?.message || `WhatsApp API responded with status ${res.status}`;
      console.error(`[WhatsApp API Error - Attempt ${attempt}]`, responseData);

      // Only retry on transient 5xx server errors
      if (res.status >= 500 && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }

      break;
    } catch (networkErr: any) {
      lastError = networkErr.message || "Network exception contacting WhatsApp API";
      console.error(`[WhatsApp Network Exception - Attempt ${attempt}]`, lastError);

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }

  // All attempts failed: Log failure safely and update participant
  try {
    await NotificationLog.create({
      participantId: params.participantId,
      registrationId: params.registrationId,
      type: "whatsapp",
      recipientMobile: recipient,
      status: "failed",
      errorMessage: lastError,
      templateName: templateName || "direct_text_message",
      attempts: attempt,
      lastAttemptAt: new Date(),
      metadata: responseData,
    });

    await Participant.findByIdAndUpdate(params.participantId, {
      whatsappStatus: "failed",
    });
  } catch (dbErr) {
    console.error("[WhatsApp Logging Failure]", dbErr);
  }

  return {
    success: false,
    status: "failed",
    error: lastError,
  };
}
