"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminSessionPayload } from "@/lib/auth";
import { EVENT_CONFIG } from "@/config/event.config";

interface AdminNavProps {
  user: AdminSessionPayload;
}

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return null;

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const navLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/participants", label: "Participants" },
    { href: "/admin/scanner", label: "QR Scanner" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between text-xs">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="font-bold text-[#132238] flex items-center gap-1.5">
              <span className="font-arabic text-base">{EVENT_CONFIG.name}</span>
              <span className="text-gray-400">/</span>
              <span>Admin</span>
            </Link>
            <span className="text-[10px] text-gray-400 capitalize px-1.5 py-0.5 rounded bg-gray-100">
              {user.role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-4 font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-[#132238] text-white"
                      : "text-gray-600 hover:text-[#132238]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-gray-500 hover:text-[#132238] hidden sm:inline"
            >
              Public Site ↗
            </Link>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
