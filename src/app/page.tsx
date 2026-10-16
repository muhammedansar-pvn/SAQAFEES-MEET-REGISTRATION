import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RegistrationForm } from "@/features/registration/RegistrationForm";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#132238]">
      <Navbar />

      <main className="flex-1 flex flex-col justify-center items-center py-12 sm:py-16 px-4">
        <RegistrationForm />
      </main>

      <Footer />
    </div>
  );
}
