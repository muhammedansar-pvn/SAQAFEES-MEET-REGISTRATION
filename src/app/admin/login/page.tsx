"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EVENT_CONFIG } from "@/config/event.config";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      // Hard navigation ensures browser sends newly set HttpOnly session cookie
      window.location.href = "/admin";
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#132238] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <span className="font-arabic text-2xl font-bold">{EVENT_CONFIG.name}</span>
            <span className="text-xs text-gray-500 block">{EVENT_CONFIG.subtitle}</span>
          </Link>
          <h2 className="text-base font-bold mt-4">Staff & Admin Login</h2>
        </div>

        <div className="border border-gray-200 rounded-xl p-6 shadow-xs">
          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="admin@saqafees.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238]"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-sm text-[#132238] focus:outline-none focus:border-[#132238] focus:ring-1 focus:ring-[#132238]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <Link href="/" className="text-xs text-gray-500 hover:text-[#132238]">
              ← Back to Homepage
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setEmail("admin@saqafees.org");
              setPassword("Admin@Saqafees2026!");
            }}
            className="text-[11px] text-gray-500 hover:text-[#132238] underline decoration-dotted cursor-pointer transition-colors"
          >
            Fill Default Credentials (admin@saqafees.org / Admin@Saqafees2026!)
          </button>
        </div>
      </div>
    </div>
  );
}
