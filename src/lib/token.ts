import crypto from "crypto";

/**
 * Generates a human-friendly unique registration ID (e.g. LQM-2026-A83F72)
 */
export function generateRegistrationId(): string {
  const year = "2026";
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  const timestampPart = (Date.now() % 10000).toString().padStart(4, "0");
  return `LQM-${year}-${randomPart}${timestampPart.slice(-2)}`;
}

/**
 * Generates a cryptographically secure random token (64 hex characters = 32 bytes)
 */
export function generateSecureVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes the verification token using SHA-256 for secure database storage.
 */
export function hashVerificationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a secure pass access token for later retrieval.
 */
export function generatePassAccessToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
