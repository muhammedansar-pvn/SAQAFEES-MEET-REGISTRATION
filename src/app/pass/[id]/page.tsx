import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { EVENT_CONFIG } from "@/config/event.config";
import { generateQrDataUrl, getVerificationUrl } from "@/features/qr/generator";
import { PrinterButton } from "./PrinterButton";

interface PassPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PassPage(props: PassPageProps) {
  const { id: registrationId } = await props.params;
  const { token } = await props.searchParams;

  await connectToDatabase();
  const participant = await Participant.findOne({ registrationId });

  if (!participant) {
    notFound();
  }

  if (token && participant.passAccessToken !== token) {
    notFound();
  }

  const qrUrl = getVerificationUrl(participant.qrTokenHash);
  const qrDataUrl = await generateQrDataUrl(qrUrl);

  return (
    <div className="min-h-screen bg-white py-10 px-4 text-[#132238]">
      <div className="max-w-md mx-auto mb-4 flex items-center justify-between no-print text-xs">
        <Link
          href={`/confirmation/${participant.registrationId}?token=${participant.passAccessToken}`}
          className="text-gray-500 hover:text-[#132238]"
        >
          ← Back
        </Link>
        <PrinterButton />
      </div>

      <div className="max-w-md mx-auto bg-white border border-gray-300 rounded-xl p-6 sm:p-8 space-y-6 print:border-none print:p-0">
        <div className="text-center border-b border-gray-200 pb-4">
          <h1 className="font-arabic text-2xl font-bold">{EVENT_CONFIG.name}</h1>
          <p className="text-xs font-semibold text-gray-700">{EVENT_CONFIG.subtitle}</p>
          <p className="text-[11px] text-gray-500 mt-1">Registration Pass</p>
        </div>

        <div className="flex flex-col items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Pass"
            className="w-44 h-44 object-contain"
          />
          <p className="font-mono text-xs font-bold mt-2">
            {participant.registrationId}
          </p>
        </div>

        <div className="border-t border-b border-gray-200 py-3 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Name:</span>
            <span className="font-bold text-[#132238]">{participant.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Place:</span>
            <span>{participant.place}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shuhba:</span>
            <span className="font-semibold">{participant.shuhba}</span>
          </div>
        </div>

        <div className="text-[11px] text-gray-600 text-center space-y-0.5">
          <p>{EVENT_CONFIG.dateFormatted}</p>
          <p>{EVENT_CONFIG.timeFormatted} IST · {EVENT_CONFIG.venue}</p>
        </div>
      </div>
    </div>
  );
}
