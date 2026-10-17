export const EVENT_CONFIG = {
  name: "اللقاء",
  subtitle: "2025 Saqafees Meet",
  dateFormatted: "Saturday, 21 November 2026",
  timeFormatted: "10:00 AM – 2:00 PM",
  timezone: "Asia/Kolkata",
  venue: "Markaz",
  startDateTimeISO: "2026-11-21T10:00:00+05:30",
  endDateTimeISO: "2026-11-21T14:00:00+05:30",
  contact: {
    phone: "+91 7994050309",
    email: "info@saqafees.org",
    location: "Jamia Markaz, Calicut, Kerala",
  },
  shuhbaOptions: [
    "HADEES",
    "THAFSEER",
    "SHAREEA",
    "ILMUL NAFS",
    "ILMUL IDARA",
    "THAKHASSUS",
    "WIRAS",
    "LUGA ARABIC",
  ] as const,
  whatsappMessageTemplate: `🌿 *لقاء – 2025 Saqafees Meet*

السلام عليكم ورحمة الله وبركاته

Dear Brother,

Your registration for لقاء – 2025 Saqafees Meet has been successfully completed. 💚

We warmly look forward to welcoming you to this academic and fraternal gathering.

📅 *Date:* Saturday, 21 November 2026
⏰ *Time:* 10:00 AM – 2:00 PM
📍 *Venue:* Markaz

Please keep your registration QR Code ready and present it at the entry gate on event day.

*Looking forward to your presence.* 🤍

بارك الله فيكم`,
} as const;

export type ShuhbaType = (typeof EVENT_CONFIG.shuhbaOptions)[number];
