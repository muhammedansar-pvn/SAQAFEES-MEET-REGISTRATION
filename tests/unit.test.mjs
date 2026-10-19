import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { normalizeMobileNumber, isValidMobileNumber, formatMobileDisplay } from "../src/lib/phone.ts";
import { generateRegistrationId, generateSecureVerificationToken, hashVerificationToken } from "../src/lib/token.ts";
import { registrationSchema } from "../src/lib/validations/registration.ts";
import { generateIcsContent, generateGoogleCalendarUrl } from "../src/features/calendar/generator.ts";
import { EVENT_CONFIG } from "../src/config/event.config.ts";
import {
  DEPARTMENT_TARGETS,
  TOTAL_DEPARTMENT_TARGET,
  matchDepartmentTarget,
  calculateDepartmentProgress,
  formatDepartmentParticipantsText,
} from "../src/features/departments/progress.ts";

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

describe("Department-wise Registration Targets & Progress", () => {
  test("Exact department targets match specification and sum to 474", () => {
    assert.equal(TOTAL_DEPARTMENT_TARGET, 474);

    const targetMap = Object.fromEntries(
      DEPARTMENT_TARGETS.map((d) => [d.name, d.target])
    );

    assert.equal(targetMap["Nafs"], 94);
    assert.equal(targetMap["Shareea"], 86);
    assert.equal(targetMap["Idara"], 85);
    assert.equal(targetMap["Hadees"], 71);
    assert.equal(targetMap["Thafseer"], 67);
    assert.equal(targetMap["Wiras"], 49);
    assert.equal(targetMap["Thq"], 18);
    assert.equal(targetMap["Luga"], 4);

    const sum = DEPARTMENT_TARGETS.reduce((acc, d) => acc + d.target, 0);
    assert.equal(sum, 474);
  });

  test("Department alias mapping resolves canonical departments without creating duplicates", () => {
    assert.equal(matchDepartmentTarget("Nafs")?.code, "ILMUL NAFS");
    assert.equal(matchDepartmentTarget("ILMUL NAFS")?.code, "ILMUL NAFS");
    assert.equal(matchDepartmentTarget("ILUMU NAFS")?.code, "ILMUL NAFS");
    assert.equal(matchDepartmentTarget("nafs")?.code, "ILMUL NAFS");

    assert.equal(matchDepartmentTarget("Thq")?.code, "THAKHASSUS");
    assert.equal(matchDepartmentTarget("THQ")?.code, "THAKHASSUS");
    assert.equal(matchDepartmentTarget("THAKHASSUS")?.code, "THAKHASSUS");

    assert.equal(matchDepartmentTarget("Idara")?.code, "ILMUL IDARA");
    assert.equal(matchDepartmentTarget("ILMUL IDARA")?.code, "ILMUL IDARA");
    assert.equal(matchDepartmentTarget("IMUL IDARA")?.code, "ILMUL IDARA");

    assert.equal(matchDepartmentTarget("Luga")?.code, "LUGA ARABIC");
    assert.equal(matchDepartmentTarget("LUGA ARABIC")?.code, "LUGA ARABIC");
    assert.equal(matchDepartmentTarget("LUGHA")?.code, "LUGA ARABIC");

    assert.equal(matchDepartmentTarget("Shareea")?.code, "SHAREEA");
    assert.equal(matchDepartmentTarget("SHAREEA")?.code, "SHAREEA");
    assert.equal(matchDepartmentTarget("SHARIA")?.code, "SHAREEA");

    assert.equal(matchDepartmentTarget("Hadees")?.code, "HADEES");
    assert.equal(matchDepartmentTarget("HADEES")?.code, "HADEES");

    assert.equal(matchDepartmentTarget("Thafseer")?.code, "THAFSEER");
    assert.equal(matchDepartmentTarget("THAFSEER")?.code, "THAFSEER");

    assert.equal(matchDepartmentTarget("Wiras")?.code, "WIRAS");
    assert.equal(matchDepartmentTarget("WIRAS")?.code, "WIRAS");
  });

  test("Percentage calculations follow (Registered Count / Department Target) * 100", () => {
    // 47 registered for Nafs (target: 94) -> exactly 50%
    const { departments } = calculateDepartmentProgress({
      "ILMUL NAFS": { count: 47, checkedIn: 10 },
    });

    const nafs = departments.find((d) => d.code === "ILMUL NAFS");
    assert.ok(nafs);
    assert.equal(nafs.registeredCount, 47);
    assert.equal(nafs.checkedInCount, 10);
    assert.equal(nafs.target, 94);
    assert.equal(nafs.remaining, 47);
    assert.equal(nafs.completionPercentage, 50.0);
    assert.equal(nafs.visualPercentage, 50.0);
    assert.equal(nafs.isExceeded, false);
  });

  test("Visual progress bar is capped at 100% while actual percentage is preserved when exceeded", () => {
    // Luga has target 4. Suppose 6 participants registered.
    const { departments } = calculateDepartmentProgress({
      "LUGA ARABIC": { count: 6 },
    });

    const luga = departments.find((d) => d.code === "LUGA ARABIC");
    assert.ok(luga);
    assert.equal(luga.registeredCount, 6);
    assert.equal(luga.target, 4);
    assert.equal(luga.remaining, 0); // No registrations remaining
    assert.equal(luga.completionPercentage, 150.0); // True completion percentage
    assert.equal(luga.visualPercentage, 100.0); // Visual progress bar capped at 100%
    assert.equal(luga.isExceeded, true);
  });

  test("Missing departments are always included with 0 registered, target remaining, and 0% completion", () => {
    // Input only contains 1 department
    const { departments, overall } = calculateDepartmentProgress([
      { _id: "HADEES", count: 71, checkedIn: 35 },
    ]);

    // All 8 official departments must be returned
    assert.equal(departments.length, 8);

    const hadees = departments.find((d) => d.code === "HADEES");
    assert.ok(hadees);
    assert.equal(hadees.registeredCount, 71);
    assert.equal(hadees.remaining, 0);
    assert.equal(hadees.completionPercentage, 100.0);

    // Other missing departments must be included with count 0
    const nafs = departments.find((d) => d.code === "ILMUL NAFS");
    assert.ok(nafs);
    assert.equal(nafs.registeredCount, 0);
    assert.equal(nafs.remaining, 94);
    assert.equal(nafs.completionPercentage, 0);
    assert.equal(nafs.visualPercentage, 0);

    assert.equal(overall.totalTarget, 474);
    assert.equal(overall.totalRegistered, 71);
    assert.equal(overall.totalRemaining, 474 - 71);
  });

  test("Departments are sorted strictly in descending order by completion percentage", () => {
    const input = [
      { _id: "LUGA ARABIC", count: 4 },   // 4 / 4 = 100%
      { _id: "THAKHASSUS", count: 9 },    // 9 / 18 = 50%
      { _id: "HADEES", count: 71 },       // 71 / 71 = 100%
      { _id: "ILMUL NAFS", count: 23 },   // 23 / 94 = 24.5%
      { _id: "SHAREEA", count: 86 },      // 86 / 86 = 100%
    ];

    const { departments } = calculateDepartmentProgress(input);

    assert.equal(departments.length, 8);

    // First departments must have 100% completion
    assert.equal(departments[0].completionPercentage, 100.0);
    assert.equal(departments[1].completionPercentage, 100.0);
    assert.equal(departments[2].completionPercentage, 100.0);

    // Verify each department has >= percentage than the next
    for (let i = 0; i < departments.length - 1; i++) {
      assert.ok(
        departments[i].rawPercentage >= departments[i + 1].rawPercentage,
        `Index ${i} (${departments[i].name}: ${departments[i].completionPercentage}%) should be >= index ${i + 1} (${departments[i + 1].name}: ${departments[i + 1].completionPercentage}%)`
      );
    }
  });

  test("Status changes update counts, percentages, remaining, and adjust rank immediately", () => {
    // Initial state: Thq is 50%, Nafs is 10%
    const initialInput = {
      "THAKHASSUS": { count: 9 },  // 9/18 = 50%
      "ILMUL NAFS": { count: 9 },  // 9/94 = 9.6%
    };

    const initial = calculateDepartmentProgress(initialInput);
    const initialThqRank = initial.departments.findIndex((d) => d.code === "THAKHASSUS");
    const initialNafsRank = initial.departments.findIndex((d) => d.code === "ILMUL NAFS");
    assert.ok(initialThqRank < initialNafsRank, "Thq should be ranked higher initially");

    // Status change: Nafs registrations surge to 94 (100%)
    const updatedInput = {
      "THAKHASSUS": { count: 9 },  // 50%
      "ILMUL NAFS": { count: 94 }, // 100%
    };

    const updated = calculateDepartmentProgress(updatedInput);
    const updatedNafs = updated.departments.find((d) => d.code === "ILMUL NAFS");
    assert.ok(updatedNafs);
    assert.equal(updatedNafs.completionPercentage, 100.0);
    assert.equal(updatedNafs.remaining, 0);

    const updatedThqRank = updated.departments.findIndex((d) => d.code === "THAKHASSUS");
    const updatedNafsRank = updated.departments.findIndex((d) => d.code === "ILMUL NAFS");
    assert.ok(updatedNafsRank < updatedThqRank, "Nafs should now rank above Thq after status change");
  });
});

describe("Department Copy Button WhatsApp Text Format", () => {
  test("Copies only Name and Place in exact WhatsApp format (*HADEES* with em-dash)", () => {
    const department = "Hadees";
    const participants = [
      {
        name: "Muhammed Ansar",
        place: "Tirur",
        mobile: "9876543210",
        registrationId: "LQM-2026-ABCD1234",
        shuhba: "HADEES",
        checkInStatus: true,
      },
      {
        name: "Abdul Rahman",
        place: "Paravanna",
        mobile: "9876543211",
        registrationId: "LQM-2026-ABCD1235",
        shuhba: "HADEES",
        checkInStatus: false,
      },
      {
        name: "Ameen",
        place: "Kozhikode",
        mobile: "9876543212",
        registrationId: "LQM-2026-ABCD1236",
        shuhba: "HADEES",
        checkInStatus: false,
      },
    ];

    const result = formatDepartmentParticipantsText(department, participants);
    const expected = [
      "*HADEES*",
      "1. Muhammed Ansar — Tirur",
      "2. Abdul Rahman — Paravanna",
      "3. Ameen — Kozhikode",
    ].join("\n");

    assert.equal(result, expected);

    // Verify exclusions
    assert.ok(!result.includes("9876543210"), "Should not include mobile number");
    assert.ok(!result.includes("LQM-2026"), "Should not include registrationId");
    assert.ok(!result.includes("checked"), "Should not include checkInStatus");
    assert.ok(!result.includes("71"), "Should not include target numbers");
  });

  test("Correctly formats another department (Nafs) with sequential numbering starting from 1", () => {
    const department = "Nafs";
    const participants = [
      { name: "Sayyid Zain", place: "Malappuram" },
      { name: "Umar Farooq", place: "Kondotty" },
    ];

    const result = formatDepartmentParticipantsText(department, participants);
    const expected = [
      "*NAFS*",
      "1. Sayyid Zain — Malappuram",
      "2. Umar Farooq — Kondotty",
    ].join("\n");

    assert.equal(result, expected);
  });

  test("Gracefully trims spaces and handles missing place or name without undefined/null", () => {
    const participants = [
      { name: "  Ali Akbar  ", place: "  Kannur  " },
      { name: "Hassan Kutty", place: "" }, // missing place
      { name: "Usman", place: undefined },  // undefined place
      { name: null, place: "Kochi" },       // missing name
      { name: "", place: null },            // both missing
    ];

    const result = formatDepartmentParticipantsText("Shareea", participants);
    const expected = [
      "*SHAREEA*",
      "1. Ali Akbar — Kannur",
      "2. Hassan Kutty",
      "3. Usman",
      "4. Kochi",
      "5. Participant",
    ].join("\n");

    assert.equal(result, expected);
    assert.ok(!result.includes("undefined"));
    assert.ok(!result.includes("null"));
  });

  test("Handles empty participant array gracefully", () => {
    const result = formatDepartmentParticipantsText("Thq", []);
    assert.equal(result, "*THQ*\n_(No registered participants yet)_");
  });
});




