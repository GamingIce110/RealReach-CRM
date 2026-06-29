import { paddleApi } from "../_lib/paddle";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { customerId } = req.body ?? {};
    if (!customerId) {
      res.status(400).json({ error: "customerId is required" });
      return;
    }

    const payload = await paddleApi<{ data: { urls: { general: string } } }>(`/customers/${customerId}/portal-sessions`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    res.status(200).json({ portalUrl: payload.data.urls.general });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Unable to create customer portal session" });
  }
}
