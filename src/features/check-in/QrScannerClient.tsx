"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface CheckInResult {
  status: "success" | "already_checked_in" | "invalid";
  message: string;
  participant?: {
    registrationId: string;
    name: string;
    place?: string;
    shuhba: string;
    checkedInAt?: string;
    checkedInBy?: string;
  };
}

export function QrScannerClient() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const startCamera = async () => {
    setCameraError(null);
    setLastResult(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-container");
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          handleQrCodeScanned(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("[Camera Start Error]", err);
      setCameraError(
        "Camera unavailable or permission denied. Please enter Registration ID manually below."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleQrCodeScanned = async (text: string) => {
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      let token = text;
      if (text.includes("/verify/")) {
        token = text.split("/verify/")[1]?.split("?")[0] || text;
      }

      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: token }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastResult({
          status: "success",
          message: "✓ Check-in Confirmed",
          participant: data.participant,
        });
      } else if (res.status === 409 && data.alreadyCheckedIn) {
        setLastResult({
          status: "already_checked_in",
          message: "⚠ Already Checked In",
          participant: data.participant,
        });
      } else {
        setLastResult({
          status: "invalid",
          message: data.error || "Invalid Pass",
        });
      }
    } catch {
      setLastResult({
        status: "invalid",
        message: "Network error during check-in.",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent, isOverride = false) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    setIsProcessing(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: manualId.trim(),
          isOverride,
          overrideNotes: isOverride ? "Staff Override via Scanner" : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setLastResult({
          status: "success",
          message: isOverride ? "✓ Override Confirmed" : "✓ Check-in Confirmed",
          participant: data.participant,
        });
        setManualId("");
      } else if (res.status === 409 && data.alreadyCheckedIn) {
        setLastResult({
          status: "already_checked_in",
          message: "⚠ Already Checked In",
          participant: data.participant,
        });
      } else {
        setLastResult({
          status: "invalid",
          message: data.error || "Registration ID not found.",
        });
      }
    } catch {
      setLastResult({
        status: "invalid",
        message: "Network error during manual check-in.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 text-[#132238]">
      {/* Scanner Box */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold">Camera Scanner</span>
          <button
            onClick={isScanning ? stopCamera : startCamera}
            className="text-xs text-gray-500 hover:text-[#132238] underline cursor-pointer"
          >
            {isScanning ? "Pause Camera" : "Resume Camera"}
          </button>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black/90 min-h-[260px] flex items-center justify-center">
          <div id="qr-reader-container" className="w-full h-full" />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs">
              Validating...
            </div>
          )}
        </div>

        {cameraError && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
            {cameraError}
          </p>
        )}
      </div>

      {/* Result Card */}
      {lastResult && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            lastResult.status === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : lastResult.status === "already_checked_in"
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          <p className="font-bold text-sm">{lastResult.message}</p>

          {lastResult.participant && (
            <div className="space-y-1 pt-1 border-t border-current/20">
              <p>
                <span className="font-medium">Name:</span> {lastResult.participant.name}
              </p>
              <p>
                <span className="font-medium">ID:</span>{" "}
                <span className="font-mono">{lastResult.participant.registrationId}</span>
              </p>
              <p>
                <span className="font-medium">Shuhba:</span> {lastResult.participant.shuhba}
              </p>
              {lastResult.participant.place && (
                <p>
                  <span className="font-medium">Place:</span> {lastResult.participant.place}
                </p>
              )}

              {lastResult.status === "already_checked_in" && (
                <div className="pt-2">
                  <button
                    onClick={(e) => {
                      setManualId(lastResult.participant!.registrationId);
                      handleManualCheckIn(e, true);
                    }}
                    className="px-3 py-1 bg-amber-700 text-white rounded text-[11px] font-medium hover:bg-amber-800 transition-colors cursor-pointer"
                  >
                    Force Admin Override
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual ID Input */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Manual ID Check-in
        </label>
        <form onSubmit={(e) => handleManualCheckIn(e, false)} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. LQM-2026-XXXX"
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:border-[#132238]"
          />
          <button
            type="submit"
            disabled={isProcessing || !manualId.trim()}
            className="h-10 px-4 bg-[#132238] text-white rounded-lg text-xs font-medium hover:bg-[#1a2f4c] disabled:opacity-50 transition-colors cursor-pointer"
          >
            Check In
          </button>
        </form>
      </div>
    </div>
  );
}
