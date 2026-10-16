import mongoose, { Schema, Document, Model } from "mongoose";
import { EVENT_CONFIG } from "@/config/event.config";

export interface IParticipant extends Document {
  registrationId: string;
  name: string;
  place: string;
  mobile: string;
  normalizedMobile: string;
  shuhba: string;
  qrTokenHash: string;
  passAccessToken: string;
  checkInStatus: boolean;
  checkedInAt?: Date;
  checkedInBy?: string;
  checkInNotes?: string;
  whatsappConsent: boolean;
  whatsappStatus: "pending" | "sent" | "delivered" | "failed" | "simulated";
  whatsappMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    registrationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    place: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedMobile: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shuhba: {
      type: String,
      required: true,
      enum: EVENT_CONFIG.shuhbaOptions,
      index: true,
    },
    qrTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passAccessToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    checkInStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: String,
    },
    checkInNotes: {
      type: String,
    },
    whatsappConsent: {
      type: Boolean,
      default: true,
    },
    whatsappStatus: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed", "simulated"],
      default: "pending",
      index: true,
    },
    whatsappMessageId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Participant) {
  mongoose.deleteModel("Participant");
}

export const Participant: Model<IParticipant> =
  mongoose.model<IParticipant>("Participant", ParticipantSchema);
