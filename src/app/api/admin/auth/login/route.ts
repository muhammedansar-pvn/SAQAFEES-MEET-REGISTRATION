import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Admin } from "@/models/Admin";
import { verifyPassword, setSessionCookie, seedDefaultAdminIfNeeded } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations/registration";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 20 login attempts per 5 minutes per IP to avoid accidental developer/tester lockout
    const limiter = rateLimit(`login_${ip}`, 20, 5 * 60 * 1000);
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 5 minutes before trying again." },
        { status: 429 }
      );
    }

    const rawBody = await req.json();
    const parseResult = adminLoginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
    }

    const { email, password } = parseResult.data;

    await connectToDatabase();
    await seedDefaultAdminIfNeeded();

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await verifyPassword(password.trim(), admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    await setSessionCookie({
      adminId: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error("[Admin Login Error]", error);
    return NextResponse.json({ error: "Login failed due to a server error" }, { status: 500 });
  }
}
