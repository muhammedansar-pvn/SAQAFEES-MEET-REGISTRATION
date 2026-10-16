"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VerifyCheckInButtonProps {
  registrationId: string;
  checkInStatus: boolean;
}

export function VerifyCheckInButton({
  registrationId,
  checkInStatus,
}: VerifyCheckInButtonProps) {
  const router = useRouter();
  const [isCheckedIn, setIsCheckedIn] = useState(checkInStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Check-in failed");
        setIsLoading(false);
        return;
      }

      setIsCheckedIn(true);
      router.refresh();
    } catch {
      setError("Network error performing check-in");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckedIn) {
    return (
      <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg text-center text-xs font-medium">
        ✓ Checked In
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-2 bg-red-50 text-red-700 text-xs rounded-lg text-center">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={isLoading}
        className="w-full h-11 bg-[#132238] hover:bg-[#1a2f4c] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
      >
        {isLoading ? "Checking in..." : "Confirm Check-in"}
      </button>
    </div>
  );
}
