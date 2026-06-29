import { NextRequest, NextResponse } from "next/server";
import { ingestLeadWebhook } from "@/services/webhookService";
import { getStateFromSupabase, persistStateToSupabase } from "@/services/persistence";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.LEAD_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const state = await getStateFromSupabase();
  const result = ingestLeadWebhook(state, payload);
  await persistStateToSupabase(result.state);

  return NextResponse.json({ ok: true, leadId: result.lead.id, summary: result.summary }, { status: 201 });
}
