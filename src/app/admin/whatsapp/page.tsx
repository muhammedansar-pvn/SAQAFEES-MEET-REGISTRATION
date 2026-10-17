import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WhatsAppManager } from "@/features/admin/whatsapp/WhatsAppManager";

export const metadata = {
  title: "WhatsApp Broadcast | Saqafees Meet Admin",
  description: "Manual WhatsApp Click-to-Chat bulk messaging for registered participants",
};

export default async function AdminWhatsAppPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <WhatsAppManager />
    </div>
  );
}
