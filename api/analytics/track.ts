import { getSupabaseAdmin } from "../_lib/supabaseAdmin";

async function sendToPostHog(event: string, properties: Record<string, any>) {
  const key = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || "https://app.posthog.com";
  if (!key) return;
  await fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, event, properties }),
  });
}

async function sendToPlausible(event: string, properties: Record<string, any>) {
  const domain = process.env.PLAUSIBLE_DOMAIN;
  if (!domain) return;
  await fetch("https://plausible.io/api/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "realreach-crm",
    },
    body: JSON.stringify({
      name: event,
      domain,
      url: process.env.APP_URL || "https://realreachcrm.com",
      props: properties,
    }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { event, properties } = req.body || {};
  if (!event) {
    res.status(400).json({ error: "event is required" });
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    await admin.from("analytics_events").insert({
      organization_id: properties?.organizationId || null,
      event_name: event,
      properties: properties || {},
    });

    await Promise.all([sendToPostHog(event, properties || {}), sendToPlausible(event, properties || {})]);
    res.status(200).json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Analytics failed" });
  }
}
