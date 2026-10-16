import { EVENT_CONFIG } from "@/config/event.config";

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-gray-100 py-8 text-center text-xs text-gray-400">
      <div className="max-w-4xl mx-auto px-4">
        <p className="font-arabic text-sm text-gray-600 mb-1" dir="rtl">
          بارك الله فيكم
        </p>
        <p>
          © 2026 {EVENT_CONFIG.name} — {EVENT_CONFIG.subtitle} · {EVENT_CONFIG.venue}
        </p>
      </div>
    </footer>
  );
}
