import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Admin, IAdmin } from "@/models/Admin";
import { connectToDatabase } from "@/lib/mongodb";

const AUTH_COOKIE_NAME = "saqafees_admin_session";
const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "saqafees_meet_super_secret_jwt_key_2026_at_least_32_chars_long"
);

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  name: string;
  role: "admin" | "staff";
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export async function createSessionToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(AUTH_SECRET);
}

export async function verifySessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET);
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: AdminSessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  // Ensure cookies work on local development/testing over HTTP, and require secure in production HTTPS/Vercel
  const isSecure = process.env.COOKIE_SECURE === "true" || process.env.VERCEL === "1";
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function seedDefaultAdminIfNeeded(): Promise<void> {
  await connectToDatabase();
  const count = await Admin.countDocuments();
  if (count === 0) {
    const email = (process.env.ADMIN_DEFAULT_EMAIL || "admin@saqafees.org").toLowerCase();
    const password = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@Saqafees2026!";
    const name = process.env.ADMIN_DEFAULT_NAME || "Saqafees Administrator";

    const passwordHash = await hashPassword(password);
    await Admin.create({
      name,
      email,
      passwordHash,
      role: "admin",
      isActive: true,
    });
    console.log(`[Seed] Initial admin user created: ${email}`);
  }
}
