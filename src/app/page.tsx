import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RegistrationForm } from "@/features/registration/RegistrationForm";
import { EVENT_CONFIG } from "@/config/event.config";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#132238]">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center items-center py-12 sm:py-16 px-4">
        <div className="max-w-xl w-full text-center space-y-4 mb-10">
          {/* 1. Event title */}
          <h1 className="font-arabic text-4xl sm:text-5xl font-bold text-[#132238] tracking-tight">
            {EVENT_CONFIG.name}
          </h1>

          {/* 2. Subtitle */}
          <h2 className="text-base sm:text-lg font-semibold text-gray-700 tracking-wide">
            {EVENT_CONFIG.subtitle}
          </h2>

          {/* 3, 4, 5. Date, Time, Venue */}
          <div className="text-xs sm:text-sm text-gray-600 space-y-1 pt-1">
            <p className="font-medium text-[#132238]">{EVENT_CONFIG.dateFormatted}</p>
            <p>{EVENT_CONFIG.timeFormatted}</p>
            <p>{EVENT_CONFIG.venue}</p>
          </div>

          {/* 6. Prominent Register Now button */}
          <div className="pt-2">
            <a
              href="#register"
              className="inline-block px-8 py-3 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-medium text-sm transition-colors cursor-pointer"
            >
              Register Now
            </a>
          </div>
        </div>

        {/* Clean, Centered Registration Form Section */}
        <div id="register" className="w-full max-w-md pt-4">
          <RegistrationForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
