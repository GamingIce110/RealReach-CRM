import { assertFeatureAccess, assertSeatLimit, getOrgSubscription } from "./subscriptionGate";

export async function enforceSubscription(req: any, options: { feature?: string; checkSeat?: boolean } = {}) {
  const organizationId = req.headers["x-organization-id"];
  if (!organizationId) {
    throw new Error("Missing organization context");
  }

  const subscription = await getOrgSubscription(String(organizationId));
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (options.feature) {
    assertFeatureAccess(subscription as any, options.feature);
  }

  if (options.checkSeat) {
    assertSeatLimit(subscription as any);
  }

  return subscription;
}
