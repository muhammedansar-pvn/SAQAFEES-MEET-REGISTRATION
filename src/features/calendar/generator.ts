import { EVENT_CONFIG } from "@/config/event.config";

/**
 * Generates the web URL to add the event directly into Google Calendar.
 * Event date: 21 Nov 2026 from 10:00 AM to 02:00 PM IST
 * 10:00 AM IST = 04:30 AM UTC -> 20261121T043000Z
 * 02:00 PM IST = 08:30 AM UTC -> 20261121T083000Z
 */
export function generateGoogleCalendarUrl(registrationId?: string): string {
  const title = encodeURIComponent(`${EVENT_CONFIG.name} — ${EVENT_CONFIG.subtitle}`);
  const dates = "20261121T043000Z/20261121T083000Z";
  const location = encodeURIComponent(EVENT_CONFIG.venue);
  const details = encodeURIComponent(
    `Official gathering: ${EVENT_CONFIG.name} — ${EVENT_CONFIG.subtitle}\n\n` +
      (registrationId ? `Your Registration ID: ${registrationId}\n` : "") +
      `Venue: ${EVENT_CONFIG.venue}\n` +
      `Time: 10:00 AM – 2:00 PM IST\n\n` +
      `Important: Please present your QR Code registration pass at the entrance.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&ctz=${encodeURIComponent(
    EVENT_CONFIG.timezone
  )}`;
}

/**
 * Generates a RFC 5545 standards-compliant iCalendar (.ics) string.
 * Includes:
 * - Stable event UID
 * - Start / End times in UTC and local timezone parameters
 * - Dual reminders (VALARM): 24 hours (1 day) before and 1 hour before
 */
export function generateIcsContent(registrationId?: string): string {
  const uid = `lqm-2026-${registrationId || "event"}@saqafees.org`;
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const startUtc = "20261121T043000Z";
  const endUtc = "20261121T083000Z";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saqafees Meet//Event Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${EVENT_CONFIG.name} - ${EVENT_CONFIG.subtitle}`,
    `LOCATION:${EVENT_CONFIG.venue}`,
    `DESCRIPTION:${EVENT_CONFIG.name} - ${EVENT_CONFIG.subtitle}\\nRegistration ID: ${
      registrationId || "N/A"
    }\\nVenue: ${EVENT_CONFIG.venue}\\nPlease bring your registration pass with QR Code.`,
    "STATUS:CONFIRMED",
    // Alarm 1: 1 day (24 hours) before
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${EVENT_CONFIG.name} is tomorrow at ${EVENT_CONFIG.venue}`,
    "END:VALARM",
    // Alarm 2: 1 hour before
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${EVENT_CONFIG.name} starts in 1 hour at ${EVENT_CONFIG.venue}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
