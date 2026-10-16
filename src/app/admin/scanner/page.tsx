import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { QrScannerClient } from "@/features/check-in/QrScannerClient";

export default async function ScannerPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-[#132238] space-y-6">
      <div className="border-b border-gray-200 pb-3 text-center sm:text-left">
        <h1 className="text-xl font-bold">QR Check-in Scanner</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Scan participant QR code or enter Registration ID.
        </p>
      </div>

      <QrScannerClient />
    </div>
  );
}
