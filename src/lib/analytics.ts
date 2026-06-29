export type AnalyticsEvent =
  | "landing_view"
  | "pricing_view"
  | "checkout_started"
  | "checkout_completed"
  | "trial_started"
  | "trial_converted"
  | "plan_upgraded"
  | "plan_downgraded"
  | "churned";

export interface AnalyticsAdapter {
  track: (event: AnalyticsEvent, props?: Record<string, string | number | boolean>) => void;
}

class ConsoleAnalyticsAdapter implements AnalyticsAdapter {
  track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      console.info(`[analytics] ${event}`, props);
    }

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties: props }),
    }).catch(() => {
      // Non-blocking analytics calls should never break user flows.
    });
  }
}

export const analytics: AnalyticsAdapter = new ConsoleAnalyticsAdapter();
