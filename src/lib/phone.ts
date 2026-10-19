/**
 * Normalizes phone numbers to standard format for duplicate prevention.
 * Supports standard Indian mobile numbers (10 digits, with optional +91 or 0 prefix)
 * and international E.164 formats.
 */
export function normalizeMobileNumber(rawNumber: string): string {
  if (!rawNumber) return "";

  // Strip spaces, dashes, parentheses, dots
  let cleaned = rawNumber.trim().replace(/[\s\-\(\)\.]/g, "");

  // If starts with +91, remove +
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith("0091")) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    // Already has 91 country code and 10 digit number
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    // 0 followed by 10 digit number: convert to 91XXXXXXXXXX
    cleaned = "91" + cleaned.substring(1);
  } else if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
    // 10-digit Indian mobile number
    cleaned = "91" + cleaned;
  } else if (cleaned.startsWith("+")) {
    // General international number with +
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Validates whether the given string is a valid mobile phone number.
 */
export function isValidMobileNumber(rawNumber: string): boolean {
  if (!rawNumber) return false;
  const normalized = normalizeMobileNumber(rawNumber);

  // Standard Indian 10-digit mobile with 91 prefix (length 12, starting with 91 followed by 6, 7, 8, or 9)
  if (/^91[6-9]\d{9}$/.test(normalized)) {
    return true;
  }

  // International format: 7 to 15 digits
  return /^\d{10,15}$/.test(normalized);
}

/**
 * Format mobile number for display (e.g. +91 98765 43210)
 */
export function formatMobileDisplay(normalizedOrRaw: string): string {
  const norm = normalizeMobileNumber(normalizedOrRaw);
  if (norm.startsWith("91") && norm.length === 12) {
    return `+91 ${norm.slice(2, 7)} ${norm.slice(7)}`;
  }
  return norm ? `+${norm}` : "";
}

