export type Role =
  | "admin"
  | "sales_manager"
  | "sales_agent"
  | "field_executive"
  | "social_media_manager";

export type LeadSource =
  | "36 Acre"
  | "MagicBricks"
  | "Housing"
  | "Facebook"
  | "Instagram"
  | "Website"
  | "Referral"
  | "Manual"
  | "Other";

export type PropertyType = "Apartment" | "Villa" | "Plot" | "Commercial" | "Rental";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Site Visit Scheduled"
  | "Negotiation"
  | "Won"
  | "Lost"
  | "Not Responding"
  | "Call Pending";

export type LeadTemperature = "Cold" | "Warm" | "Hot";

export type AvailabilityStatus = "Available" | "Hold" | "Sold" | "Rented";

export type FollowupChannel = "WhatsApp" | "SMS" | "Email" | "Call Reminder";

export type FollowupStatus = "Pending" | "Completed" | "Snoozed";

export type CallStatus = "initiated" | "agent_no_answer" | "bridged" | "completed" | "failed";

export type SocialPostType =
  | "Instagram Reel"
  | "Instagram Post"
  | "Facebook Post"
  | "LinkedIn Post"
  | "Story";

export type SocialPostStatus = "Idea" | "Draft" | "Scheduled" | "Published";

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string;
  role: Role;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  organizationId: string;
  title: string;
  location: string;
  address: string;
  propertyType: PropertyType;
  price: number;
  size: string;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  furnishingStatus: string;
  availabilityStatus: AvailabilityStatus;
  description: string;
  amenities: string[];
  images: string[];
  documents: string[];
  developer: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email: string;
  source: LeadSource;
  propertyType: PropertyType;
  budgetMin: number;
  budgetMax: number;
  preferredLocation: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  assignedAgentId: string;
  notes: string;
  nextFollowupAt: string | null;
  createdAt: string;
  lastContactedAt: string | null;
}

export interface Activity {
  id: string;
  organizationId: string;
  leadId: string;
  actorId: string;
  type: "lead_created" | "call" | "message" | "note" | "followup" | "property_share" | "status_change";
  content: string;
  createdAt: string;
}

export interface CallLog {
  id: string;
  organizationId: string;
  leadId: string;
  agentId: string;
  callSid: string;
  conferenceSid: string;
  status: CallStatus;
  duration: number;
  recordingUrl: string | null;
  startedAt: string;
  endedAt: string;
  outcome: string;
}

export interface MessageLog {
  id: string;
  organizationId: string;
  leadId: string;
  agentId: string;
  channel: "WhatsApp" | "SMS" | "Email";
  templateName: string;
  content: string;
  status: "queued" | "sent" | "failed";
  createdAt: string;
}

export interface Followup {
  id: string;
  organizationId: string;
  leadId: string;
  assignedTo: string;
  channel: FollowupChannel;
  template: string;
  dueAt: string;
  status: FollowupStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  organizationId: string;
  userId: string;
  checkInTime: string;
  checkOutTime: string | null;
  checkInLatitude: number;
  checkInLongitude: number;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  status: "Present" | "Late" | "Absent";
  notes: string;
  selfieUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPost {
  id: string;
  organizationId: string;
  type: SocialPostType;
  caption: string;
  mediaUrl: string;
  status: SocialPostStatus;
  scheduledAt: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface IntegrationSettings {
  mode: "dry-run" | "production";
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioNumber: string;
  whatsappSender: string;
  resendApiKey: string;
  webhookSecret: string;
  openAiKey: string;
  leadAssignmentMode: "Round Robin" | "Manual" | "Least Busy Agent";
}

export interface CRMState {
  organization: Organization;
  profiles: Profile[];
  leads: Lead[];
  properties: Property[];
  activities: Activity[];
  calls: CallLog[];
  messages: MessageLog[];
  followups: Followup[];
  attendance: Attendance[];
  socialPosts: SocialPost[];
  notifications: NotificationItem[];
  integrationSettings: IntegrationSettings;
  roundRobinCursor: number;
}
