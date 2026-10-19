"use client";

import { useState } from "react";

interface SettingsFormProps {
  initialSettings: {
    isRegistrationOpen: boolean;
    eventTitle: string;
    eventSubtitle: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    venueMalayalam?: string;
    shuhbaOptions: string[];
    whatsappMessageTemplate?: string;
    contactPhone: string;
    contactEmail: string;
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [form, setForm] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update settings");
      } else {
        setSuccessMsg("Settings updated successfully");
      }
    } catch {
      setErrorMsg("Network error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 text-xs text-[#132238]">
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Registration Status Toggle */}
      <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Public Registration</p>
          <p className="text-gray-500">Allow participants to register on the homepage</p>
        </div>

        <button
          type="button"
          onClick={() => setForm({ ...form, isRegistrationOpen: !form.isRegistrationOpen })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
            form.isRegistrationOpen
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-red-50 text-red-800 border border-red-300"
          }`}
        >
          {form.isRegistrationOpen ? "Open (Active)" : "Closed (Disabled)"}
        </button>
      </div>

      {/* Contact Details */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-gray-600 mb-1">Contact Phone</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#132238]"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Contact Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#132238]"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSaving}
        className="h-10 px-5 bg-[#132238] hover:bg-[#1a2f4c] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
