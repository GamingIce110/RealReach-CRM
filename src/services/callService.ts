import type { CallLog, CRMState, Lead, Profile } from "../types";
import { makeId, nowIso } from "./helpers";

interface TriggerBridgeInput {
  state: CRMState;
  lead: Lead;
  preferredAgentId: string | null;
}

interface TriggerBridgeResult {
  callLog: CallLog;
  assignedAgentId: string | null;
  notificationMessage: string;
}

export function triggerBridgeCall(input: TriggerBridgeInput): TriggerBridgeResult {
  const { state, lead, preferredAgentId } = input;
  const mode = state.integrationSettings.mode;
  const agents = state.profiles.filter((profile) => profile.role === "sales_agent" && profile.isAvailable);

  const sortedAgents = [
    ...agents.filter((agent) => agent.id === preferredAgentId),
    ...agents.filter((agent) => agent.id !== preferredAgentId),
  ];

  const connectedAgent: Profile | undefined = sortedAgents[0];
  const startedAt = nowIso();
  const endedAt = new Date(Date.now() + 1000 * 60 * 2).toISOString();

  if (!connectedAgent) {
    return {
      assignedAgentId: null,
      notificationMessage: "No agents answered. Lead moved to Call Pending and manager notified.",
      callLog: {
        id: makeId("call"),
        organizationId: state.organization.id,
        leadId: lead.id,
        agentId: preferredAgentId ?? "unassigned",
        callSid: makeId("CA"),
        conferenceSid: makeId("CF"),
        status: "agent_no_answer",
        duration: 0,
        recordingUrl: null,
        startedAt,
        endedAt,
        outcome: "No agent answered",
      },
    };
  }

  const isDryRun = mode === "dry-run";
  return {
    assignedAgentId: connectedAgent.id,
    notificationMessage: isDryRun
      ? `Dry-run bridge completed: ${connectedAgent.fullName} connected with ${lead.fullName}.`
      : `Twilio bridge started for ${connectedAgent.fullName}.`,
    callLog: {
      id: makeId("call"),
      organizationId: state.organization.id,
      leadId: lead.id,
      agentId: connectedAgent.id,
      callSid: makeId("CA"),
      conferenceSid: makeId("CF"),
      status: "completed",
      duration: 130,
      recordingUrl: isDryRun ? null : "https://api.twilio.com/recording/demo",
      startedAt,
      endedAt,
      outcome: isDryRun ? "Dry run: Agent confirmed and lead bridged" : "Connected",
    },
  };
}
