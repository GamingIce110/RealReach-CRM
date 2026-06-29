import { paddleApi } from "../_lib/paddle";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { plan, email, organizationId } = req.body ?? {};
    const priceId =
      plan === "basic"
        ? process.env.PADDLE_PRICE_BASIC
        : plan === "pro"
        ? process.env.PADDLE_PRICE_PRO
        : process.env.PADDLE_PRICE_AGENCY;

    if (!priceId) {
      res.status(500).json({ error: "Price ID not configured" });
      return;
    }

    const response = await paddleApi<{ data: { id: string; checkout: { url: string } } }>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { organization_id: organizationId, selected_plan: plan },
        customer: { email },
      }),
    });

    res.status(200).json({ transactionId: response.data.id, checkoutUrl: response.data.checkout.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Unable to create checkout" });
  }
}
