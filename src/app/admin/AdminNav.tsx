"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminSessionPayload } from "@/lib/auth";
import { EVENT_CONFIG } from "@/config/event.config";

interface AdminNavProps {
  user: AdminSessionPayload;
}

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const navLinks = [
    { href: "/admin", label: "Overview", shortLabel: "Overview" },
    { href: "/admin/participants", label: "Participants", shortLabel: "Participants" },
    { href: "/admin/whatsapp", label: "WhatsApp Broadcast", shortLabel: "Broadcast" },
    { href: "/admin/scanner", label: "QR Scanner", shortLabel: "Scanner" },
    { href: "/admin/settings", label: "Settings", shortLabel: "Settings" },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Desktop Single-Row & Mobile Top-Row */}
        <div className="h-14 flex items-center justify-between text-xs">
          {/* Brand & Role */}
          <div className="flex items-center gap-2.5">
            <Link href="/admin" className="font-bold text-[#132238] flex items-center gap-1.5">
              <span className="font-arabic text-base sm:text-lg">{EVENT_CONFIG.name}</span>
              <span className="text-gray-400">/</span>
              <span>Admin</span>
            </Link>
            <span className="text-[10px] text-gray-500 capitalize px-1.5 py-0.5 rounded bg-gray-100 font-medium">
              {user.role}
            </span>
          </div>

          {/* Desktop Navigation Links (hidden on mobile, shown on sm+) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-3 font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-[#132238] text-white"
                      : "text-gray-600 hover:text-[#132238] hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-gray-500 hover:text-[#132238] hidden sm:inline text-xs font-medium"
            >
              Public Site ↗
            </Link>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 font-semibold cursor-pointer transition-colors text-[11px]"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Tab Bar (visible only on mobile screens < md) */}
        <nav className="flex md:hidden items-center gap-1 overflow-x-auto pb-2.5 pt-0.5 -mx-4 px-4 scrollbar-none text-xs font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-[11px] shrink-0 ${
                  isActive
                    ? "bg-[#132238] text-white font-bold shadow-2xs"
                    : "text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-[#132238]"
                }`}
              >
                {link.shortLabel}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
