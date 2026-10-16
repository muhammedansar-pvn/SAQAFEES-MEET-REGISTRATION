import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { normalizeMobileNumber, isValidMobileNumber, formatMobileDisplay } from "../src/lib/phone.ts";
import { generateRegistrationId, generateSecureVerificationToken, hashVerificationToken } from "../src/lib/token.ts";
import { registrationSchema } from "../src/lib/validations/registration.ts";
import { generateIcsContent, generateGoogleCalendarUrl } from "../src/features/calendar/generator.ts";
import { EVENT_CONFIG } from "../src/config/event.config.ts";

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
      mobile: "9876543210",
      shuhba: "HADEES",
    });
    assert.equal(result.success, true);
  });

  test("Fails when required field is missing", () => {
    const result = registrationSchema.safeParse({
      name: "",
      place: "Calicut",
      mobile: "9876543210",
      shuhba: "HADEES",
    });
    assert.equal(result.success, false);
  });

  test("Fails when Shuhba is not one of the approved options", () => {
    const result = registrationSchema.safeParse({
      name: "Ahmed Kutty",
      place: "Calicut",
      mobile: "9876543210",
      shuhba: "Unapproved Department",
    });
    assert.equal(result.success, false);
  });

  test("Accepts all 8 official Shuhba options", () => {
    EVENT_CONFIG.shuhbaOptions.forEach((shuhba) => {
      const res = registrationSchema.safeParse({
        name: "Test Participant",
        place: "Kozhikode",
        mobile: "9846012345",
        shuhba,
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
