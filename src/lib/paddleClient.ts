import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

export async function getPaddleInstance() {
  if (!paddlePromise) {
    const token = (import.meta as any).env?.VITE_PADDLE_CLIENT_TOKEN as string | undefined;
    const env = ((import.meta as any).env?.VITE_PADDLE_ENV as string | undefined) ?? "sandbox";

    if (!token) {
      return undefined;
    }

    paddlePromise = initializePaddle({
      token,
      environment: env === "production" ? "production" : "sandbox",
    });
  }

  return paddlePromise;
}
