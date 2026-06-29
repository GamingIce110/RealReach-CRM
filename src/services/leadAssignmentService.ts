import type { CRMState, Profile } from "../types";

function availableAgents(state: CRMState): Profile[] {
  return state.profiles.filter((profile) => profile.role === "sales_agent" && profile.isAvailable);
}

export function assignLeadAgent(state: CRMState): { agentId: string | null; nextCursor: number } {
  const agents = availableAgents(state);
  if (!agents.length) {
    return { agentId: null, nextCursor: state.roundRobinCursor };
  }

  if (state.integrationSettings.leadAssignmentMode === "Least Busy Agent") {
    const assignedCount = new Map<string, number>();
    for (const lead of state.leads) {
      assignedCount.set(lead.assignedAgentId, (assignedCount.get(lead.assignedAgentId) ?? 0) + 1);
    }

    const leastBusy = [...agents].sort(
      (a, b) => (assignedCount.get(a.id) ?? 0) - (assignedCount.get(b.id) ?? 0)
    )[0];
    return { agentId: leastBusy.id, nextCursor: state.roundRobinCursor };
  }

  const index = state.roundRobinCursor % agents.length;
  return { agentId: agents[index].id, nextCursor: index + 1 };
}
