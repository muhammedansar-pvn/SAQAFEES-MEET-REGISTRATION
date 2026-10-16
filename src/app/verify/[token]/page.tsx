import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { Participant } from "@/models/Participant";
import { hashVerificationToken } from "@/lib/token";
import { getSession } from "@/lib/auth";
import { EVENT_CONFIG } from "@/config/event.config";
import { VerifyCheckInButton } from "./VerifyCheckInButton";

interface VerifyPageProps {
  params: Promise<{ token: string }>;
}

export default async function VerifyPage(props: VerifyPageProps) {
  const { token } = await props.params;

  await connectToDatabase();
  const tokenHash = hashVerificationToken(token);

  const participant = await Participant.findOne({
    $or: [{ qrTokenHash: tokenHash }, { qrTokenHash: token }],
  });

  const session = await getSession();

  if (!participant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 text-[#132238]">
        <div className="max-w-sm w-full p-6 border border-gray-200 rounded-xl text-center space-y-3">
          <h1 className="text-base font-bold text-red-600">Invalid QR Code</h1>
          <p className="text-xs text-gray-500">
            Invalid or unverified registration pass.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs text-[#132238] underline hover:text-[#C5A059]"
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 text-[#132238]">
      <div className="max-w-sm w-full border border-gray-200 rounded-xl p-6 space-y-5">
        <div className="text-center border-b border-gray-100 pb-3">
          <h1 className="font-arabic text-xl font-bold">{EVENT_CONFIG.name}</h1>
          <p className="text-xs text-gray-500">{EVENT_CONFIG.subtitle}</p>
        </div>

        {/* Status */}
        <div className="text-center">
          {participant.checkInStatus ? (
            <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
              Already Checked In
            </span>
          ) : (
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
              Valid Pass
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 text-xs border-t border-b border-gray-100 py-3">
          <div className="flex justify-between">
            <span className="text-gray-500">ID:</span>
            <span className="font-mono font-bold">{participant.registrationId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Name:</span>
            <span className="font-bold">{participant.name}</span>
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

        {/* Staff Check-in */}
        {session ? (
          <VerifyCheckInButton
            registrationId={participant.registrationId}
            checkInStatus={participant.checkInStatus}
          />
        ) : (
          <div className="text-center">
            <Link
              href="/admin/scanner"
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Staff Login
            </Link>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
