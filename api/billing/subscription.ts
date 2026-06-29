import { getOrgSubscription } from "../_lib/subscriptionGate";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const organizationId = String(req.query.organizationId || "");
    if (!organizationId) {
      res.status(400).json({ error: "organizationId is required" });
      return;
    }

    const subscription = await getOrgSubscription(organizationId);
    if (!subscription) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }

    res.status(200).json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Unable to fetch subscription" });
  }
}
