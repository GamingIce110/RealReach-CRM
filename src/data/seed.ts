import type {
  CRMState,
  Lead,
  LeadSource,
  Property,
  PropertyType,
  Role,
  SocialPostType,
} from "../types";

const now = new Date();

const sources: LeadSource[] = [
  "36 Acre",
  "MagicBricks",
  "Housing",
  "Facebook",
  "Instagram",
  "Website",
  "Referral",
  "Manual",
  "Other",
];

const propertyTypes: PropertyType[] = ["Apartment", "Villa", "Plot", "Commercial", "Rental"];

const locations = ["Gurgaon", "Noida", "Dwarka Expressway", "Golf Course Road", "Sohna Road"];
const postTypes: SocialPostType[] = ["Instagram Reel", "Instagram Post", "Facebook Post", "LinkedIn Post", "Story"];

const roleUsers: Array<{ name: string; role: Role; phone: string; email: string; available: boolean }> = [
  { name: "Ananya Mehra", role: "admin", phone: "+919820001001", email: "admin@estateflow.in", available: true },
  {
    name: "Ravi Khanna",
    role: "sales_manager",
    phone: "+919820001002",
    email: "manager@estateflow.in",
    available: true,
  },
  { name: "Priya Sood", role: "sales_agent", phone: "+919820001003", email: "agent1@estateflow.in", available: true },
  {
    name: "Karan Arora",
    role: "sales_agent",
    phone: "+919820001004",
    email: "agent2@estateflow.in",
    available: true,
  },
  {
    name: "Ishita Dey",
    role: "field_executive",
    phone: "+919820001005",
    email: "field@estateflow.in",
    available: true,
  },
  {
    name: "Neeraj Jain",
    role: "social_media_manager",
    phone: "+919820001006",
    email: "social@estateflow.in",
    available: true,
  },
];

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function createProperties(organizationId: string): Property[] {
  return Array.from({ length: 10 }, (_, i) => {
    const location = locations[i % locations.length];
    return {
      id: uid("prop"),
      organizationId,
      title: `Skyline Residency ${i + 1}`,
      location,
      address: `${10 + i}, ${location}, NCR`,
      propertyType: propertyTypes[i % propertyTypes.length],
      price: 5500000 + i * 1200000,
      size: `${1100 + i * 120} sq.ft`,
      bedrooms: 2 + (i % 3),
      bathrooms: 2,
      floor: `${(i % 12) + 1}`,
      furnishingStatus: i % 2 ? "Semi-Furnished" : "Furnished",
      availabilityStatus: i % 4 === 0 ? "Hold" : "Available",
      description: `Premium ${propertyTypes[i % propertyTypes.length]} at ${location} with metro connectivity and clubhouse.`,
      amenities: ["Clubhouse", "Power Backup", "Security"],
      images: [
        `https://picsum.photos/seed/estate-${i + 1}/900/600`,
        `https://picsum.photos/seed/estate-gallery-${i + 1}/900/600`,
      ],
      documents: ["Brochure.pdf"],
      developer: `Developer ${i + 1}`,
      tags: ["new-launch", "ncr"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  });
}

function createLeads(organizationId: string, agentIds: string[]): Lead[] {
  return Array.from({ length: 20 }, (_, i) => {
    const source = sources[i % sources.length];
    const propertyType = propertyTypes[i % propertyTypes.length];
    const location = locations[i % locations.length];
    const createdAt = new Date(Date.now() - i * 1000 * 60 * 73).toISOString();
    return {
      id: uid("lead"),
      organizationId,
      fullName: `Lead Prospect ${i + 1}`,
      phone: `+91999${String(100000 + i).slice(0, 6)}`,
      email: `lead${i + 1}@example.com`,
      source,
      propertyType,
      budgetMin: 4500000 + i * 100000,
      budgetMax: 9500000 + i * 150000,
      preferredLocation: location,
      status: i % 6 === 0 ? "Interested" : i % 5 === 0 ? "Site Visit Scheduled" : "New",
      temperature: i % 4 === 0 ? "Hot" : i % 2 === 0 ? "Warm" : "Cold",
      assignedAgentId: agentIds[i % agentIds.length],
      notes: `Needs ${propertyType} in ${location}`,
      nextFollowupAt: new Date(Date.now() + (i % 7) * 1000 * 60 * 60 * 8).toISOString(),
      createdAt,
      lastContactedAt: i % 3 === 0 ? new Date(Date.now() - i * 1000 * 60 * 20).toISOString() : null,
    };
  });
}

export function createSeedState(): CRMState {
  const organizationId = "org_estateflow_001";
  const timestamp = new Date().toISOString();
  const profiles = roleUsers.map((entry) => ({
    id: uid("usr"),
    organizationId,
    fullName: entry.name,
    phone: entry.phone,
    email: entry.email,
    role: entry.role,
    isAvailable: entry.available,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const agentIds = profiles.filter((p) => p.role === "sales_agent").map((p) => p.id);
  const leads = createLeads(organizationId, agentIds);
  const properties = createProperties(organizationId);

  return {
    organization: {
      id: organizationId,
      name: "EstateFlow CRM",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    profiles,
    leads,
    properties,
    activities: leads.slice(0, 12).map((lead, i) => ({
      id: uid("act"),
      organizationId,
      leadId: lead.id,
      actorId: lead.assignedAgentId,
      type: "lead_created",
      content: `Lead added from ${lead.source}`,
      createdAt: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
    })),
    calls: leads.slice(0, 8).map((lead, i) => ({
      id: uid("call"),
      organizationId,
      leadId: lead.id,
      agentId: lead.assignedAgentId,
      callSid: uid("CA"),
      conferenceSid: uid("CF"),
      status: "completed",
      duration: 120 + i * 20,
      recordingUrl: null,
      startedAt: new Date(Date.now() - i * 1000 * 60 * 90).toISOString(),
      endedAt: new Date(Date.now() - i * 1000 * 60 * 88).toISOString(),
      outcome: i % 2 === 0 ? "Connected" : "Requested callback",
    })),
    messages: leads.slice(0, 6).map((lead, i) => ({
      id: uid("msg"),
      organizationId,
      leadId: lead.id,
      agentId: lead.assignedAgentId,
      channel: i % 2 === 0 ? "WhatsApp" : "SMS",
      templateName: "property_share",
      content: `Shared property details with ${lead.fullName}`,
      status: "sent",
      createdAt: new Date(Date.now() - i * 1000 * 60 * 41).toISOString(),
    })),
    followups: leads.slice(0, 10).map((lead, i) => ({
      id: uid("fol"),
      organizationId,
      leadId: lead.id,
      assignedTo: lead.assignedAgentId,
      channel: i % 3 === 0 ? "Call Reminder" : "WhatsApp",
      template: "Hi {{leadName}}, checking in regarding your property search.",
      dueAt: new Date(Date.now() + i * 1000 * 60 * 60).toISOString(),
      status: i % 4 === 0 ? "Completed" : "Pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    attendance: profiles
      .filter((p) => p.role !== "social_media_manager")
      .map((profile, i) => ({
        id: uid("att"),
        organizationId,
        userId: profile.id,
        checkInTime: new Date(Date.now() - 1000 * 60 * (90 + i * 5)).toISOString(),
        checkOutTime: i % 2 ? null : new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        checkInLatitude: 28.4595 + i * 0.001,
        checkInLongitude: 77.0266 + i * 0.001,
        checkOutLatitude: i % 2 ? null : 28.4595 + i * 0.001,
        checkOutLongitude: i % 2 ? null : 77.0266 + i * 0.001,
        status: i === 0 ? "Late" : "Present",
        notes: "Morning check-in",
        selfieUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    socialPosts: Array.from({ length: 8 }, (_, i) => ({
      id: uid("post"),
      organizationId,
      type: postTypes[i % postTypes.length],
      caption: `Property spotlight ${i + 1} in ${locations[i % locations.length]}`,
      mediaUrl: `https://picsum.photos/seed/social-${i + 1}/600/600`,
      status: i % 4 === 0 ? "Published" : i % 3 === 0 ? "Scheduled" : "Draft",
      scheduledAt: new Date(Date.now() + i * 1000 * 60 * 60 * 5).toISOString(),
      assignedTo: profiles.find((p) => p.role === "social_media_manager")?.id ?? profiles[0].id,
      notes: "CTA: Book a site visit",
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    notifications: [
      {
        id: uid("not"),
        organizationId,
        userId: profiles[2].id,
        title: "New lead assigned",
        body: "Lead Prospect 3 assigned to you",
        read: false,
        createdAt: timestamp,
      },
      {
        id: uid("not"),
        organizationId,
        userId: profiles[1].id,
        title: "Missed lead call",
        body: "Lead Prospect 6 call missed by all agents",
        read: false,
        createdAt: timestamp,
      },
    ],
    integrationSettings: {
      mode: "dry-run",
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioNumber: "",
      whatsappSender: "",
      resendApiKey: "",
      webhookSecret: "local-secret",
      openAiKey: "",
      leadAssignmentMode: "Round Robin",
    },
    roundRobinCursor: 0,
  };
}
