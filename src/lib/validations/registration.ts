import { z } from "zod";
import { EVENT_CONFIG } from "@/config/event.config";
import { isValidMobileNumber } from "@/lib/phone";

export const registrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  place: z
    .string()
    .trim()
    .min(2, "Place must be at least 2 characters")
    .max(100, "Place must not exceed 100 characters"),
  mobile: z
    .string()
    .trim()
    .min(10, "Enter a valid mobile number")
    .refine((val) => isValidMobileNumber(val), {
      message: "Enter a valid 10-digit mobile number",
    }),
  shuhba: z.enum(EVENT_CONFIG.shuhbaOptions as unknown as [string, ...string[]], {
    message: "Select a valid department",
  }),
  whatsappConsent: z.boolean().default(true).optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const adminUpdateParticipantSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  place: z.string().trim().min(2).max(100).optional(),
  mobile: z
    .string()
    .trim()
    .refine((val) => isValidMobileNumber(val), {
      message: "Invalid mobile number",
    })
    .optional(),
  shuhba: z.enum(EVENT_CONFIG.shuhbaOptions as unknown as [string, ...string[]]).optional(),
  checkInStatus: z.boolean().optional(),
  checkInNotes: z.string().optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
