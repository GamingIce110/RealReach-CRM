import type { Activity, CRMState, Lead, MessageLog, Profile, Property } from "../types";
import { makeId, nowIso } from "./helpers";

export function shareProperty(
  state: CRMState,
  lead: Lead,
  property: Property,
  agent: Profile
): { message: MessageLog; activity: Activity } {
  const shareLink = `https://estateflow.app/share/${property.id}`;
  const content = `Hi ${lead.fullName}, sharing details of ${property.title} in ${property.location}. Price: INR ${property.price.toLocaleString("en-IN")}. Photos and details: ${shareLink}`;

  return {
    message: {
      id: makeId("msg"),
      organizationId: state.organization.id,
      leadId: lead.id,
      agentId: agent.id,
      channel: "WhatsApp",
      templateName: "property_share",
      content,
      status: "sent",
      createdAt: nowIso(),
    },
    activity: {
      id: makeId("act"),
      organizationId: state.organization.id,
      leadId: lead.id,
      actorId: agent.id,
      type: "property_share",
      content: `Shared ${property.title} with ${lead.fullName}`,
      createdAt: nowIso(),
    },
  };
}
