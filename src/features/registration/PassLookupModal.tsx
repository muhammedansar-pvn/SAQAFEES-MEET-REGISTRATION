"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PassLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PassLookupModal({ isOpen, onClose }: PassLookupModalProps) {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!mobile.trim()) {
      setError("Please enter your mobile number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/registrations/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No registration found");
        setIsLoading(false);
        return;
      }

      onClose();
      router.push(`/confirmation/${data.registrationId}?token=${data.passAccessToken}`);
    } catch {
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-gray-200 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
        >
          ✕
        </button>

        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold text-[#132238]">Find My Pass</h3>
          <p className="text-xs text-gray-500 mt-1">
            Enter your registered mobile number
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLookup} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              disabled={isLoading}
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#132238] hover:bg-[#1a2f4c] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLoading ? "Searching..." : "Find Pass"}
          </button>
        </form>
      </div>
    </div>
  );
}
