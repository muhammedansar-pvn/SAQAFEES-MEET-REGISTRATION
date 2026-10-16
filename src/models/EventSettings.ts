import mongoose, { Schema, Document, Model } from "mongoose";
import { EVENT_CONFIG } from "@/config/event.config";

export interface IEventSettings extends Document {
  isRegistrationOpen: boolean;
  eventTitle: string;
  eventSubtitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  venueMalayalam: string;
  shuhbaOptions: string[];
  whatsappMessageTemplate: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSettingsSchema = new Schema<IEventSettings>(
  {
    isRegistrationOpen: {
      type: Boolean,
      default: true,
    },
    eventTitle: {
      type: String,
      default: EVENT_CONFIG.name,
    },
    eventSubtitle: {
      type: String,
      default: EVENT_CONFIG.subtitle,
    },
    eventDate: {
      type: String,
      default: EVENT_CONFIG.dateFormatted,
    },
    eventTime: {
      type: String,
      default: EVENT_CONFIG.timeFormatted,
    },
    venue: {
      type: String,
      default: EVENT_CONFIG.venue,
    },
    venueMalayalam: {
      type: String,
      default: "",
    },
    shuhbaOptions: {
      type: [String],
      default: [...EVENT_CONFIG.shuhbaOptions],
    },
    whatsappMessageTemplate: {
      type: String,
      default: EVENT_CONFIG.whatsappMessageTemplate,
    },
    contactPhone: {
      type: String,
      default: EVENT_CONFIG.contact.phone,
    },
    contactEmail: {
      type: String,
      default: EVENT_CONFIG.contact.email,
    },
  },
  {
    timestamps: true,
  }
);

export const EventSettings: Model<IEventSettings> =
  mongoose.models.EventSettings ||
  mongoose.model<IEventSettings>("EventSettings", EventSettingsSchema);
