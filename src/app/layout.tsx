import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EVENT_CONFIG } from "@/config/event.config";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: `${EVENT_CONFIG.name} — ${EVENT_CONFIG.subtitle}`,
  description: `Official registration portal for ${EVENT_CONFIG.name} (${EVENT_CONFIG.subtitle}) at ${EVENT_CONFIG.venue}. Saturday, 21 November 2026.`,
  keywords: ["Saqafees Meet", "لقاء", "Markaz", "Registration", "Pass", "Event"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-white text-[#132238] antialiased selection:bg-[#C5A059]/15 selection:text-[#132238]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
