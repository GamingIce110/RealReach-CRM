import crypto from "node:crypto";

export interface PaddleWebhookEvent {
  event_type: string;
  data: Record<string, any>;
  occurred_at?: string;
}

export function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(";");
  const timestamp = parts.find((part) => part.startsWith("ts="))?.replace("ts=", "");
  const hash = parts.find((part) => part.startsWith("h1="))?.replace("h1=", "");

  if (!timestamp || !hash) return false;

  const currentTs = Math.floor(Date.now() / 1000);
  const eventTs = Number(timestamp);
  if (Number.isNaN(eventTs) || Math.abs(currentTs - eventTs) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}:${rawBody}`;
  const computed = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export async function paddleApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  const environment = process.env.PADDLE_ENV === "production" ? "api.paddle.com" : "sandbox-api.paddle.com";

  if (!apiKey) {
    throw new Error("Missing PADDLE_API_KEY");
  }

  const response = await fetch(`https://${environment}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Paddle API failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}
