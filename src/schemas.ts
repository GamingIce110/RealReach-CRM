import { z } from "zod";

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

export const leadPayloadSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(phoneRegex, "Invalid phone number"),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(["36 Acre", "MagicBricks", "Housing", "Facebook", "Instagram", "Website", "Referral", "Manual", "Other"]),
  propertyType: z.enum(["Apartment", "Villa", "Plot", "Commercial", "Rental"]),
  budgetMin: z.number().nonnegative(),
  budgetMax: z.number().nonnegative(),
  preferredLocation: z.string().min(2),
  notes: z.string().optional(),
});

export const leadFormSchema = leadPayloadSchema.extend({
  nextFollowupAt: z.string().optional(),
});

export const propertyFormSchema = z.object({
  title: z.string().min(2),
  location: z.string().min(2),
  address: z.string().min(2),
  propertyType: z.enum(["Apartment", "Villa", "Plot", "Commercial", "Rental"]),
  price: z.number().positive(),
  size: z.string().min(1),
  bedrooms: z.number().nonnegative(),
  bathrooms: z.number().nonnegative(),
  floor: z.string().min(1),
  furnishingStatus: z.string().min(2),
  availabilityStatus: z.enum(["Available", "Hold", "Sold", "Rented"]),
  description: z.string().min(8),
});

export const followupSchema = z.object({
  leadId: z.string().min(1),
  assignedTo: z.string().min(1),
  channel: z.enum(["WhatsApp", "SMS", "Email", "Call Reminder"]),
  template: z.string().min(8),
  dueAt: z.string().min(1),
});

export type LeadPayloadInput = z.infer<typeof leadPayloadSchema>;
export type PropertyFormInput = z.infer<typeof propertyFormSchema>;
