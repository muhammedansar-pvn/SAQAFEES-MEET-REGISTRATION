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

      {/* Official Pass Card with Poster Background */}
      <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] rounded-2xl overflow-hidden shadow-xl border border-amber-200/60 bg-[#E8DA80] print:shadow-none print:border-none print:max-w-[400px]">
        {/* Poster Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/pass-bg.png"
          alt="Event Poster Pass Background"
          className="w-full h-auto block select-none"
        />

        {/* Verified Participant Pass Badge */}
        <div className="absolute inset-x-0 top-[37%] flex flex-col items-center justify-center px-4">
          <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-xl shadow-md border border-amber-200/80 text-center w-[230px]">
            <p className="font-bold text-xs text-[#132238] uppercase truncate">{participant.name}</p>
            <p className="font-mono text-[10px] text-amber-700 font-bold">{participant.registrationId}</p>

            {/* Scannable QR Code */}
            <div className="my-2 bg-white p-2 rounded-lg inline-block border border-gray-100 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Registration QR Code"
                className="w-32 h-32 object-contain"
              />
            </div>

            <p className="text-[10px] text-gray-700 font-semibold truncate">
              {participant.shuhba} · {participant.place}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">Present at entrance for check-in</p>
          </div>
        </div>
      </div>
    </div>
  );
}
