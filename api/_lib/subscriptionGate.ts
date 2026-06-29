import type { PlanId } from "../../src/lib/plans";
import { getSupabaseAdmin } from "./supabaseAdmin";

const permissionMap: Record<PlanId, string[]> = {
  basic: ["dashboard", "leads_manual", "properties", "followups_basic"],
  pro: [
    "dashboard",
    "leads_manual",
    "properties",
    "followups_basic",
    "webhook_automation",
    "auto_assignment",
    "reports",
    "social_planner",
  ],
  agency: [
    "dashboard",
    "leads_manual",
    "properties",
    "followups_basic",
    "webhook_automation",
    "auto_assignment",
    "reports",
    "social_planner",
    "attendance",
    "advanced_analytics",
  ],
};

export async function getOrgSubscription(organizationId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("subscriptions")
    .select("organization_id, plan, status, renewal_date, trial_end, seats_used")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function assertFeatureAccess(subscription: { plan: PlanId; status: string; seats_used?: number }, feature: string) {
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    throw new Error("Subscription inactive");
  }
  if (!permissionMap[subscription.plan].includes(feature)) {
    throw new Error("Feature locked for current plan");
  }
}

export function assertSeatLimit(subscription: { plan: PlanId; seats_used?: number }) {
  const limit = subscription.plan === "basic" ? 2 : subscription.plan === "pro" ? 10 : 30;
  if ((subscription.seats_used ?? 0) >= limit) {
    throw new Error("Seat limit reached");
  }
}
