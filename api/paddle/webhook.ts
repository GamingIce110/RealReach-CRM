import { getSupabaseAdmin } from "../_lib/supabaseAdmin";
import { verifyPaddleSignature, type PaddleWebhookEvent } from "../_lib/paddle";

async function readRawBody(req: any): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function extractPlanFromItems(items: Array<{ price?: { id?: string } }> = []) {
  const id = items[0]?.price?.id || "";
  if (id === process.env.PADDLE_PRICE_BASIC) return "basic";
  if (id === process.env.PADDLE_PRICE_AGENCY) return "agency";
  return "pro";
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const signature = req.headers["paddle-signature"] as string | undefined;

  if (!secret || !signature) {
    res.status(400).json({ error: "Missing webhook secret or signature" });
    return;
  }

  try {
    const rawBody = await readRawBody(req);

    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const event = JSON.parse(rawBody) as PaddleWebhookEvent;
    const admin = getSupabaseAdmin();

    if (
      event.event_type === "subscription.created" ||
      event.event_type === "subscription.activated" ||
      event.event_type === "subscription_created"
    ) {
      const data = event.data;
      await admin.from("subscriptions").upsert({
        organization_id: data.custom_data?.organization_id,
        subscription_id: data.id,
        customer_id: data.customer_id,
        plan: extractPlanFromItems(data.items),
        status: data.status,
        renewal_date: data.current_billing_period?.ends_at ?? null,
        trial_end: data.trial_dates?.ends_at ?? null,
        billing_email: data.customer?.email ?? "",
      });
    }

    if (event.event_type === "subscription.updated" || event.event_type === "subscription_updated") {
      const data = event.data;
      await admin
        .from("subscriptions")
        .update({
          status: data.status,
          plan: extractPlanFromItems(data.items),
          renewal_date: data.current_billing_period?.ends_at ?? null,
          trial_end: data.trial_dates?.ends_at ?? null,
        })
        .eq("subscription_id", data.id);
    }

    if (event.event_type === "subscription.canceled" || event.event_type === "subscription_cancelled") {
      await admin.from("subscriptions").update({ status: "canceled" }).eq("subscription_id", event.data.id);
    }

    if (event.event_type === "transaction.payment_failed" || event.event_type === "payment_failed") {
      await admin.from("subscriptions").update({ status: "past_due" }).eq("customer_id", event.data.customer_id);
    }

    if (event.event_type === "transaction.completed" || event.event_type === "payment_succeeded") {
      await admin.from("subscriptions").update({ status: "active" }).eq("customer_id", event.data.customer_id);
    }

    if (event.event_type === "subscription.trialing") {
      await admin.from("subscriptions").update({ status: "trialing" }).eq("subscription_id", event.data.id);
    }

    if (event.event_type === "trial_ended") {
      await admin.from("subscriptions").update({ status: "inactive" }).eq("subscription_id", event.data.id);
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Webhook processing failed" });
  }
}
