"use client";

import Link from "next/link";
import { useState } from "react";
import { EVENT_CONFIG } from "@/config/event.config";
import { PassLookupModal } from "@/features/registration/PassLookupModal";

export function Navbar() {
  const [isLookupOpen, setIsLookupOpen] = useState(false);

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-arabic text-xl font-bold text-[#132238]">
              {EVENT_CONFIG.name}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {EVENT_CONFIG.subtitle}
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setIsLookupOpen(true)}
              className="text-gray-600 hover:text-[#132238] transition-colors cursor-pointer"
            >
              Find Pass
            </button>
          </div>
        </div>
      </header>

      <PassLookupModal isOpen={isLookupOpen} onClose={() => setIsLookupOpen(false)} />
    </>
  );
}
