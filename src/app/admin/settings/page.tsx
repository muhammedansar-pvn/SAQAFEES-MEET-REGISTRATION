import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { EventSettings } from "@/models/EventSettings";
import { EVENT_CONFIG } from "@/config/event.config";
import { SettingsForm } from "@/features/admin/SettingsForm";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  await connectToDatabase();
  let settings = await EventSettings.findOne();
  if (!settings) {
    settings = await EventSettings.create({
      isRegistrationOpen: true,
      eventTitle: EVENT_CONFIG.name,
      eventSubtitle: EVENT_CONFIG.subtitle,
      eventDate: EVENT_CONFIG.dateFormatted,
      eventTime: EVENT_CONFIG.timeFormatted,
      venue: EVENT_CONFIG.venue,
      shuhbaOptions: [...EVENT_CONFIG.shuhbaOptions],
      whatsappMessageTemplate: EVENT_CONFIG.whatsappMessageTemplate,
      contactPhone: EVENT_CONFIG.contact.phone,
      contactEmail: EVENT_CONFIG.contact.email,
    });
  }

  const plainSettings = {
    isRegistrationOpen: settings.isRegistrationOpen,
    eventTitle: settings.eventTitle,
    eventSubtitle: settings.eventSubtitle,
    eventDate: settings.eventDate,
    eventTime: settings.eventTime,
    venue: settings.venue,
    shuhbaOptions: [...settings.shuhbaOptions],
    whatsappMessageTemplate: settings.whatsappMessageTemplate,
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-[#132238] space-y-6">
      <div className="border-b border-gray-200 pb-3">
        <h1 className="text-xl font-bold">Event Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure registration status and contact information.
        </p>
      </div>

      <SettingsForm initialSettings={plainSettings} />
    </div>
  );
}
