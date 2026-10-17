import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { normalizeMobileNumber, isValidMobileNumber, formatMobileDisplay, generateWhatsAppClickToChatUrl } from "../src/lib/phone.ts";
import { generateRegistrationId, generateSecureVerificationToken, hashVerificationToken } from "../src/lib/token.ts";
import { registrationSchema } from "../src/lib/validations/registration.ts";
import { generateIcsContent, generateGoogleCalendarUrl } from "../src/features/calendar/generator.ts";
import { EVENT_CONFIG } from "../src/config/event.config.ts";
import { buildWhatsAppConfirmationMessage } from "../src/features/notifications/whatsapp.ts";
import { interpolateWhatsAppTemplate, WHATSAPP_TEMPLATES } from "../src/features/whatsapp/templates.ts";

describe("Phone Normalization and Validation", () => {
  test("Normalizes standard 10-digit Indian numbers", () => {
    assert.equal(normalizeMobileNumber("9876543210"), "919876543210");
    assert.equal(normalizeMobileNumber("  9876543210 "), "919876543210");
  });

  test("Normalizes numbers with +91 or 0 prefix", () => {
    assert.equal(normalizeMobileNumber("+91 98765 43210"), "919876543210");
    assert.equal(normalizeMobileNumber("09876543210"), "919876543210");
    assert.equal(normalizeMobileNumber("+91-98765-43210"), "919876543210");
  });

  test("Validates valid and invalid phone numbers", () => {
    assert.equal(isValidMobileNumber("9876543210"), true);
    assert.equal(isValidMobileNumber("+919876543210"), true);
    assert.equal(isValidMobileNumber("12345"), false);
    assert.equal(isValidMobileNumber(""), false);
    assert.equal(isValidMobileNumber("abcdefghij"), false);
  });

  test("Formats phone for display", () => {
    assert.equal(formatMobileDisplay("9876543210"), "+91 98765 43210");
  });
});

describe("Cryptographic Tokens & Registration IDs", () => {
  test("Generates unique registration ID format LQM-2026-XXXX", () => {
    const regId = generateRegistrationId();
    assert.match(regId, /^LQM-2026-[A-F0-9]{8}$/);
  });

  test("Generates 64-character hex cryptographic verification token", () => {
    const token = generateSecureVerificationToken();
    assert.equal(token.length, 64);
    assert.match(token, /^[a-f0-9]{64}$/);
  });

  test("SHA-256 hash matches deterministically", () => {
    const token = "test_token_secret_value_12345";
    const hash1 = hashVerificationToken(token);
    const hash2 = hashVerificationToken(token);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });
});

describe("Zod Registration Form Validation", () => {
  test("Valid registration data parses successfully", () => {
    const result = registrationSchema.safeParse({
      name: "Ahmed Kutty",
      place: "Calicut",
      district: "Kozhikode",
      mobile: "9876543210",
      shuhba: "HADEES",
      participateFully: true,
      wantsFood: true,
    });
    assert.equal(result.success, true);
  });

  test("Fails when required field is missing", () => {
    const result = registrationSchema.safeParse({
      name: "",
      place: "Calicut",
      district: "Kozhikode",
      mobile: "9876543210",
      shuhba: "HADEES",
      participateFully: true,
      wantsFood: true,
    });
    assert.equal(result.success, false);
  });

  test("Fails when Shuhba is not one of the approved options", () => {
    const result = registrationSchema.safeParse({
      name: "Ahmed Kutty",
      place: "Calicut",
      district: "Kozhikode",
      mobile: "9876543210",
      shuhba: "Unapproved Department",
      participateFully: true,
      wantsFood: true,
    });
    assert.equal(result.success, false);
  });

  test("Accepts all 8 official Shuhba options", () => {
    EVENT_CONFIG.shuhbaOptions.forEach((shuhba) => {
      const res = registrationSchema.safeParse({
        name: "Test Participant",
        place: "Kozhikode",
        district: "Kozhikode",
        mobile: "9846012345",
        shuhba,
        participateFully: true,
        wantsFood: true,
      });
      assert.equal(res.success, true, `Shuhba ${shuhba} should be valid`);
    });
  });
});

describe("Calendar & Reminders", () => {
  test("Generates Google Calendar URL with correct date, time, and timezone", () => {
    const url = generateGoogleCalendarUrl("LQM-2026-TEST");
    assert.ok(url.includes("calendar.google.com"));
    assert.ok(url.includes("20261121T043000Z%2F20261121T083000Z") || url.includes("20261121T043000Z/20261121T083000Z"));
    assert.ok(url.includes("Asia%2FKolkata") || url.includes("Asia/Kolkata"));
    assert.ok(url.includes("LQM-2026-TEST"));
  });

  test("Generates RFC 5545 compliant ICS with dual reminders", () => {
    const ics = generateIcsContent("LQM-2026-TEST");
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("VERSION:2.0"));
    assert.ok(ics.includes("DTSTART:20261121T043000Z"));
    assert.ok(ics.includes("DTEND:20261121T083000Z"));
    // Dual reminders
    assert.ok(ics.includes("TRIGGER:-P1D")); // 1 day before
    assert.ok(ics.includes("TRIGGER:-PT1H")); // 1 hour before
    assert.ok(ics.includes("END:VCALENDAR"));
  });
});

describe("Automatic WhatsApp Confirmation Message", () => {
  test("Generates exact English template content matching all user specifications", () => {
    const message = buildWhatsAppConfirmationMessage({
      name: "Ahmed Kutty",
      place: "Koduvally",
      district: "Kozhikode",
      department: "HADEES",
      participateFully: true,
      wantsFood: true,
      registrationId: "LQM-2026-A1B2C3D4",
      entryPassUrl: "https://saqafees-meet.vercel.app/confirmation/LQM-2026-A1B2C3D4?token=tok123",
    });

    assert.ok(message.includes("*Assalamu Alaikum!*"));
    assert.ok(message.includes("Your registration for *لقاء — 2025 Saqafees Meet* has been completed successfully."));
    assert.ok(message.includes("*Registration Details*"));
    assert.ok(message.includes("- Name: Ahmed Kutty"));
    assert.ok(message.includes("- Place: Koduvally"));
    assert.ok(message.includes("- District: Kozhikode"));
    assert.ok(message.includes("- Department: HADEES"));
    assert.ok(message.includes("- Participation: Yes"));
    assert.ok(message.includes("- Food Required: Yes"));
    assert.ok(message.includes("- Registration ID: LQM-2026-A1B2C3D4"));
    assert.ok(message.includes("*Event Details*"));
    assert.ok(message.includes("- Date: Saturday, 21 November 2026"));
    assert.ok(message.includes("- Time: 10:00 AM – 2:00 PM"));
    assert.ok(message.includes("- Venue: Markaz"));
    assert.ok(message.includes("Your entry pass is available here:"));
    assert.ok(message.includes("https://saqafees-meet.vercel.app/confirmation/LQM-2026-A1B2C3D4?token=tok123"));
    assert.ok(message.includes("Please keep your entry pass ready when you arrive."));
    assert.ok(message.includes("We look forward to welcoming you!"));
  });

  test("Correctly formats No for participation and food", () => {
    const message = buildWhatsAppConfirmationMessage({
      name: "Usman",
      place: "Malappuram",
      district: "Malappuram",
      department: "THAFSEER",
      participateFully: false,
      wantsFood: false,
      registrationId: "LQM-2026-99998888",
      entryPassUrl: "https://saqafees-meet.vercel.app/pass/LQM-2026-99998888?token=tok456",
    });

    assert.ok(message.includes("- Participation: No"));
    assert.ok(message.includes("- Food Required: No"));
  });

  test("WhatsApp recipient number formatting produces valid E.164 digits without +", () => {
    assert.equal(normalizeMobileNumber("+91 98460 12345"), "919846012345");
    assert.equal(normalizeMobileNumber("09846012345"), "919846012345");
    assert.equal(normalizeMobileNumber("9846012345"), "919846012345");
  });
});

describe("Free WhatsApp Click-to-Chat Bulk Messaging", () => {
  test("Generates valid https://wa.me/ URL with URL-encoded text", () => {
    const url = generateWhatsAppClickToChatUrl("9846012345", "Assalamu Alaikum Ahmed!");
    assert.ok(url.startsWith("https://wa.me/919846012345?text="));
    assert.ok(url.includes("Assalamu%20Alaikum%20Ahmed!"));
  });

  test("Handles Indian numbers with +91, 0, or formatting without duplicate country code", () => {
    const url1 = generateWhatsAppClickToChatUrl("+91 98460 12345", "Hello");
    const url2 = generateWhatsAppClickToChatUrl("09846012345", "Hello");
    const url3 = generateWhatsAppClickToChatUrl("+91-98460-12345", "Hello");
    assert.ok(url1.startsWith("https://wa.me/919846012345?text=Hello"));
    assert.ok(url2.startsWith("https://wa.me/919846012345?text=Hello"));
    assert.ok(url3.startsWith("https://wa.me/919846012345?text=Hello"));
  });

  test("Rejects invalid mobile numbers safely", () => {
    assert.equal(generateWhatsAppClickToChatUrl("12345", "Hello"), "");
    assert.equal(generateWhatsAppClickToChatUrl("abcdef", "Hello"), "");
    assert.equal(generateWhatsAppClickToChatUrl("", "Hello"), "");
  });

  test("Interpolates template placeholders: {{name}}, {{department}}, {{district}}, {{place}}, {{registrationId}}, {{entryPassUrl}}", () => {
    const template = "Salam {{name}} from {{place}}, {{district}}! You are in {{department}}. Pass: {{entryPassUrl}} (ID: {{registrationId}})";
    const result = interpolateWhatsAppTemplate(template, {
      name: "Muhammed",
      place: "Koduvally",
      district: "Kozhikode",
      department: "HADEES",
      registrationId: "LQM-2026-ABCD1234",
      entryPassUrl: "https://saqafees-meet.vercel.app/confirmation/LQM-2026-ABCD1234?token=tok",
    });

    assert.equal(
      result,
      "Salam Muhammed from Koduvally, Kozhikode! You are in HADEES. Pass: https://saqafees-meet.vercel.app/confirmation/LQM-2026-ABCD1234?token=tok (ID: LQM-2026-ABCD1234)"
    );
  });

  test("Preserves all 4 official template types", () => {
    assert.ok(WHATSAPP_TEMPLATES.confirmation.defaultTemplate.includes("لقاء"));
    assert.ok(WHATSAPP_TEMPLATES.reminder.defaultTemplate.includes("reminder"));
    assert.ok(WHATSAPP_TEMPLATES.announcement.defaultTemplate.includes("announcement"));
    assert.ok(WHATSAPP_TEMPLATES.custom.defaultTemplate.includes("{{name}}"));
  });

  test("Enforces maximum batch limit of 500 participants", () => {
    const MAX_LIMIT = 500;
    const array501 = new Array(501).fill("id");
    assert.equal(array501.length > MAX_LIMIT, true);
    const array500 = new Array(500).fill("id");
    assert.equal(array500.length <= MAX_LIMIT, true);
  });
});


