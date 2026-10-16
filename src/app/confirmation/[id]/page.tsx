import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { EVENT_CONFIG } from "@/config/event.config";
import { generateQrDataUrl, getVerificationUrl } from "@/features/qr/generator";
import { generateGoogleCalendarUrl } from "@/features/calendar/generator";

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ConfirmationPage(props: ConfirmationPageProps) {
  const { id: registrationId } = await props.params;
  const { token } = await props.searchParams;

  await connectToDatabase();
  const participant = await Participant.findOne({ registrationId });

  if (!participant) {
    notFound();
  }

  if (token && participant.passAccessToken !== token) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 text-center">
        <div className="max-w-sm w-full p-6 border border-red-200 rounded-xl">
          <h2 className="text-base font-bold text-red-600">Unauthorized Access</h2>
          <p className="text-xs text-gray-600 mt-2">
            Invalid pass access token.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 bg-[#132238] text-white text-xs font-medium rounded-lg"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  const qrUrl = getVerificationUrl(participant.qrTokenHash);
  const qrDataUrl = await generateQrDataUrl(qrUrl);
  const googleCalendarUrl = generateGoogleCalendarUrl(participant.registrationId);

  const qrDownloadUrl = `/api/registrations/${participant.registrationId}/qr?token=${participant.passAccessToken}`;
  const pdfDownloadUrl = `/api/registrations/${participant.registrationId}/pass?token=${participant.passAccessToken}`;
  const icsDownloadUrl = `/api/calendar/ics?regId=${participant.registrationId}`;

  return (
    <div className="min-h-screen bg-white text-[#132238] py-12 px-4">
      <div className="max-w-md mx-auto text-center space-y-6">
        {/* Back Link */}
        <div className="text-left">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-[#132238] transition-colors"
          >
            ← Home
          </Link>
        </div>

        {/* Success Header */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-700">
            ✓ Registration Successful
          </p>
          <h1 className="text-2xl font-bold text-[#132238]">{participant.name}</h1>
          <p className="font-mono text-xs text-gray-500 font-semibold">
            ID: {participant.registrationId}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Registration QR Code"
            className="w-48 h-48 object-contain"
          />
          <p className="text-[11px] text-gray-400 mt-2">
            Present this QR code at the entrance
          </p>
        </div>

        {/* Simple Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <a
            href={qrDownloadUrl}
            download={`QR-${participant.registrationId}.png`}
            className="h-11 flex items-center justify-center rounded-lg border border-gray-300 hover:border-gray-400 text-gray-800 font-medium transition-colors"
          >
            Download QR Code
          </a>

          <a
            href={pdfDownloadUrl}
            download={`Pass-${participant.registrationId}.pdf`}
            className="h-11 flex items-center justify-center rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-medium transition-colors"
          >
            Download PDF Pass
          </a>

          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 flex items-center justify-center rounded-lg border border-gray-300 hover:border-gray-400 text-gray-800 font-medium transition-colors"
          >
            Add to Google Calendar
          </a>

          <a
            href={icsDownloadUrl}
            download="saqafees-meet-2026.ics"
            className="h-11 flex items-center justify-center rounded-lg border border-gray-300 hover:border-gray-400 text-gray-800 font-medium transition-colors"
          >
            Download Calendar Reminder
          </a>
        </div>
      </div>
    </div>
  );
}
