import { enforceSubscription } from "../_lib/subscriptionMiddleware";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await enforceSubscription(req, { feature: "social_planner" });
    res.status(200).json({ posts: [] });
  } catch (error: any) {
    res.status(403).json({ error: error.message || "Feature unavailable for current plan" });
  }
}
