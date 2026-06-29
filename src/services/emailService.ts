import type { CRMState, Lead, MessageLog, Profile } from "../types";
import { makeId, nowIso } from "./helpers";

export function sendEmail(state: CRMState, lead: Lead, agent: Profile, body: string): MessageLog {
  const modeLabel = state.integrationSettings.mode === "dry-run" ? "[DRY RUN]" : "[LIVE]";
  return {
    id: makeId("msg"),
    organizationId: state.organization.id,
    leadId: lead.id,
    agentId: agent.id,
    channel: "Email",
    templateName: "email_followup",
    content: `${modeLabel} ${body}`,
    status: "sent",
    createdAt: nowIso(),
  };
}
