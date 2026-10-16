import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { generateQrPngBuffer, getVerificationUrl } from "@/features/qr/generator";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    await connectToDatabase();
    const participant = await Participant.findOne({ registrationId });

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Verify access: Either matching passAccessToken OR authorized admin session
    const adminSession = await getSession();
    if (!adminSession && (!token || participant.passAccessToken !== token)) {
      return NextResponse.json(
        { error: "Unauthorized access to this registration QR code." },
        { status: 401 }
      );
    }

    // Embed verification token URL in QR code
    // Note: We use the rawVerificationToken if supplied or verify endpoint with the participant's qrTokenHash identifier
    const qrUrl = getVerificationUrl(participant.qrTokenHash);
    const pngBuffer = await generateQrPngBuffer(qrUrl);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="QR-Pass-${registrationId}.png"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("[QR Download Error]", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
