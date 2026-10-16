"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CONFIG } from "@/config/event.config";

export function RegistrationForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    place: "",
    district: "",
    mobile: "",
    shuhba: "",
    participateFully: true,
    wantsFood: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    registrationId: string;
    passAccessToken: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDuplicateInfo(null);

    if (!formData.name.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    if (!formData.place.trim()) {
      setErrorMessage("Please enter your place");
      return;
    }
    if (!formData.district.trim()) {
      setErrorMessage("Please enter your district");
      return;
    }
    if (!formData.mobile.trim()) {
      setErrorMessage("Please enter your mobile number");
      return;
    }
    if (!formData.shuhba) {
      setErrorMessage("Please select your department");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.isDuplicate) {
          setErrorMessage(data.error);
          if (data.existingRegistrationId && data.passAccessToken) {
            setDuplicateInfo({
              registrationId: data.existingRegistrationId,
              passAccessToken: data.passAccessToken,
            });
          }
        } else {
          setErrorMessage(data.error || "Registration failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("last_registered_id", data.registrationId);
        sessionStorage.setItem("last_raw_token", data.rawVerificationToken);
        sessionStorage.setItem("last_pass_token", data.passAccessToken);
      }

      router.push(`/confirmation/${data.registrationId}?token=${data.passAccessToken}`);
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-[#132238]">Registration</h2>
        <p className="text-xs text-gray-500 mt-1">
          Enter your details to receive your event entry pass
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
          <p>{errorMessage}</p>
          {duplicateInfo && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/confirmation/${duplicateInfo.registrationId}?token=${duplicateInfo.passAccessToken}`
                )
              }
              className="mt-2 text-xs font-semibold text-[#132238] underline hover:text-[#C5A059]"
            >
              View Your Pass →
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Field 1: Name */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={isLoading}
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] placeholder-gray-400 focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238] transition-colors"
          />
        </div>

        {/* Field 2 & 3: Place & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Place <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isLoading}
              placeholder="e.g. Koduvally"
              value={formData.place}
              onChange={(e) => setFormData({ ...formData, place: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] placeholder-gray-400 focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238] transition-colors"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isLoading}
              placeholder="e.g. Kozhikode"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] placeholder-gray-400 focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238] transition-colors"
            />
          </div>
        </div>

        {/* Field 4: Mobile Number */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            disabled={isLoading}
            placeholder="10-digit mobile number"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] placeholder-gray-400 focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238] transition-colors"
          />
        </div>

        {/* Field 5: Department */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">
            Department (Shuhba) <span className="text-red-500">*</span>
          </label>
          <select
            required
            disabled={isLoading}
            value={formData.shuhba}
            onChange={(e) => setFormData({ ...formData, shuhba: e.target.value })}
            className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] bg-white focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238] transition-colors cursor-pointer"
          >
            <option value="" disabled>
              -- Select Department --
            </option>
            {EVENT_CONFIG.shuhbaOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Field 6: Will You Participate Fully? */}
        <div>
          <label className="block font-medium text-gray-700 mb-1.5">
            Will you participate fully? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setFormData({ ...formData, participateFully: true })}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center cursor-pointer ${
                formData.participateFully
                  ? "bg-[#132238] text-white border-[#132238]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setFormData({ ...formData, participateFully: false })}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center cursor-pointer ${
                !formData.participateFully
                  ? "bg-[#132238] text-white border-[#132238]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Field 7: Do You Want Food? */}
        <div>
          <label className="block font-medium text-gray-700 mb-1.5">
            Do you want food? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setFormData({ ...formData, wantsFood: true })}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center cursor-pointer ${
                formData.wantsFood
                  ? "bg-[#132238] text-white border-[#132238]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setFormData({ ...formData, wantsFood: false })}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center cursor-pointer ${
                !formData.wantsFood
                  ? "bg-[#132238] text-white border-[#132238]"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 mt-2 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
        >
          {isLoading ? "Registering..." : "Register Now"}
        </button>
      </form>
    </div>
  );
}
