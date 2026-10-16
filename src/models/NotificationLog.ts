import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotificationLog extends Document {
  participantId: mongoose.Types.ObjectId;
  registrationId: string;
  type: "whatsapp" | "sms" | "email";
  recipientMobile: string;
  status: "pending" | "sent" | "delivered" | "failed" | "simulated";
  providerMessageId?: string;
  templateName?: string;
  attempts: number;
  lastAttemptAt: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    registrationId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["whatsapp", "sms", "email"],
      default: "whatsapp",
      required: true,
    },
    recipientMobile: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed", "simulated"],
      default: "pending",
      index: true,
    },
    providerMessageId: {
      type: String,
      index: true,
    },
    templateName: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog ||
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
