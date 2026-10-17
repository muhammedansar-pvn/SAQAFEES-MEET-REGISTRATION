import mongoose, { Schema, Document, Model } from "mongoose";

export type CampaignParticipantStatus =
  | "PENDING"
  | "OPENED"
  | "MARKED_SENT"
  | "SKIPPED"
  | "FAILED_TO_OPEN";

export interface ICampaignParticipant {
  participantId: mongoose.Types.ObjectId;
  registrationId: string;
  name: string;
  mobile: string;
  normalizedMobile: string;
  place?: string;
  district?: string;
  department: string;
  passAccessToken: string;
  status: CampaignParticipantStatus;
  openedAt?: Date;
  markedAt?: Date;
  notes?: string;
}

export interface IWhatsAppCampaign extends Document {
  title: string;
  templateType: "confirmation" | "reminder" | "announcement" | "custom";
  messageTemplate: string;
  status: "draft" | "in_progress" | "paused" | "completed";
  createdBy: string;
  totalCount: number;
  currentIndex: number;
  participants: ICampaignParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

const CampaignParticipantSchema = new Schema<ICampaignParticipant>(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },
    registrationId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    normalizedMobile: {
      type: String,
      required: true,
    },
    place: {
      type: String,
      default: "",
    },
    district: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      required: true,
    },
    passAccessToken: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "OPENED", "MARKED_SENT", "SKIPPED", "FAILED_TO_OPEN"],
      default: "PENDING",
      index: true,
    },
    openedAt: {
      type: Date,
    },
    markedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  { _id: true }
);

const WhatsAppCampaignSchema = new Schema<IWhatsAppCampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    templateType: {
      type: String,
      enum: ["confirmation", "reminder", "announcement", "custom"],
      default: "confirmation",
      required: true,
    },
    messageTemplate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "in_progress", "paused", "completed"],
      default: "in_progress",
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    totalCount: {
      type: Number,
      required: true,
      default: 0,
    },
    currentIndex: {
      type: Number,
      required: true,
      default: 0,
    },
    participants: {
      type: [CampaignParticipantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const WhatsAppCampaign: Model<IWhatsAppCampaign> =
  mongoose.models.WhatsAppCampaign ||
  mongoose.model<IWhatsAppCampaign>("WhatsAppCampaign", WhatsAppCampaignSchema);
