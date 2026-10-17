import { EVENT_CONFIG } from "@/config/event.config";

export interface TemplateData {
  name: string;
  department: string;
  district: string;
  place?: string;
  registrationId: string;
  entryPassUrl: string;
  [key: string]: string | undefined;
}

export type WhatsAppTemplateType = "confirmation" | "reminder" | "announcement" | "custom";

export interface TemplateDefinition {
  id: WhatsAppTemplateType;
  label: string;
  description: string;
  defaultTemplate: string;
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateType, TemplateDefinition> = {
  confirmation: {
    id: "confirmation",
    label: "Registration Confirmation",
    description: "Official registration confirmation and pass delivery",
    defaultTemplate: `*Assalamu Alaikum {{name}}!*

Your registration for *لقاء — 2025 Saqafees Meet* has been confirmed successfully.

*Registration Details*
- Department: {{department}}
- District: {{district}}
- Registration ID: {{registrationId}}

*Event Details*
- Date: ${EVENT_CONFIG.dateFormatted}
- Time: ${EVENT_CONFIG.timeFormatted}
- Venue: ${EVENT_CONFIG.venue}

Your official entry pass is ready:
{{entryPassUrl}}

Please keep your pass ready when arriving at the venue.
Looking forward to welcoming you!`,
  },
  reminder: {
    id: "reminder",
    label: "Event Reminder",
    description: "Gentle reminder before event day with date, time, and venue",
    defaultTemplate: `*Assalamu Alaikum {{name}}!*

This is a gentle reminder that *لقاء — 2025 Saqafees Meet* will take place on *${EVENT_CONFIG.dateFormatted}* (${EVENT_CONFIG.timeFormatted}) at *${EVENT_CONFIG.venue}*.

*Your Registration*
- Department: {{department}}
- District: {{district}}
- Pass Link: {{entryPassUrl}}

Please arrive 15 minutes before the start time.
We warmly look forward to your presence!`,
  },
  announcement: {
    id: "announcement",
    label: "General Announcement",
    description: "Important update or timing announcement for participants",
    defaultTemplate: `*Assalamu Alaikum {{name}}!*

Important announcement regarding *لقاء — 2025 Saqafees Meet* for participants in the *{{department}}* department.

Please note the gathering begins promptly at 10:00 AM at ${EVENT_CONFIG.venue}.

View your entry pass:
{{entryPassUrl}}

Jazakallahu Khair.`,
  },
  custom: {
    id: "custom",
    label: "Custom Message",
    description: "Compose your own message with dynamic placeholders",
    defaultTemplate: `*Assalamu Alaikum {{name}}!*

We are looking forward to seeing you at *لقاء — 2025 Saqafees Meet* representing the *{{department}}* department from *{{district}}*.

Your Pass: {{entryPassUrl}}

Have a blessed day!`,
  },
};

export const AVAILABLE_PLACEHOLDERS = [
  { key: "{{name}}", description: "Participant's full name" },
  { key: "{{department}}", description: "Department / Shuhba" },
  { key: "{{district}}", description: "District" },
  { key: "{{place}}", description: "Place" },
  { key: "{{registrationId}}", description: "Unique Registration ID" },
  { key: "{{entryPassUrl}}", description: "Direct secure entry pass URL" },
] as const;

/**
 * Replaces placeholders like {{name}}, {{department}}, {{district}}, etc.
 */
export function interpolateWhatsAppTemplate(template: string, data: TemplateData): string {
  if (!template) return "";
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, data.name || "")
    .replace(/\{\{\s*department\s*\}\}/gi, data.department || "")
    .replace(/\{\{\s*district\s*\}\}/gi, data.district || "")
    .replace(/\{\{\s*place\s*\}\}/gi, data.place || "")
    .replace(/\{\{\s*registrationId\s*\}\}/gi, data.registrationId || "")
    .replace(/\{\{\s*entryPassUrl\s*\}\}/gi, data.entryPassUrl || "");
}
