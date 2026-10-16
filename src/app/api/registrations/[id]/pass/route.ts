import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { generateQrDataUrl, getVerificationUrl } from "@/features/qr/generator";
import { generatePdfPass } from "@/features/pdf/generator";
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

    // Check authorization: matching passAccessToken OR admin session
    const adminSession = await getSession();
    if (!adminSession && (!token || participant.passAccessToken !== token)) {
      return NextResponse.json(
        { error: "Unauthorized access to this registration pass." },
        { status: 401 }
      );
    }

    const qrUrl = getVerificationUrl(participant.qrTokenHash);
    const qrDataUrl = await generateQrDataUrl(qrUrl);

    const pdfBuffer = generatePdfPass({
      registrationId: participant.registrationId,
      name: participant.name,
      place: participant.place,
      district: participant.district,
      shuhba: participant.shuhba,
      qrDataUrl,
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Pass-${registrationId}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("[PDF Download Error]", error);
    return NextResponse.json({ error: "Failed to generate pass PDF" }, { status: 500 });
  }
}
