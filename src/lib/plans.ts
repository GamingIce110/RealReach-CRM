export type PlanId = "basic" | "pro" | "agency";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "inactive";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthly: number;
  seatLimit: number;
  highlight?: string;
  features: string[];
  gates: {
    webhookAutomation: boolean;
    automaticAssignment: boolean;
    socialPlanner: boolean;
    attendance: boolean;
    advancedAnalytics: boolean;
    reports: boolean;
  };
}

export interface OrganizationSubscription {
  organizationId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  renewalDate: string | null;
  trialEnd: string | null;
  billingEmail: string;
  seatsUsed: number;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 49,
    seatLimit: 2,
    features: [
      "Manual lead management",
      "Property inventory",
      "Manual communication",
      "Basic follow-ups",
      "Personal dashboard",
    ],
    gates: {
      webhookAutomation: false,
      automaticAssignment: false,
      socialPlanner: false,
      attendance: false,
      advancedAnalytics: false,
      reports: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 149,
    seatLimit: 10,
    highlight: "Most Popular",
    features: [
      "Everything in Basic",
      "Webhook lead intake",
      "Round-robin assignment",
      "Least-busy routing",
      "Automatic call logging",
      "Message templates",
      "Social media module",
      "Team management",
      "Performance reports",
    ],
    gates: {
      webhookAutomation: true,
      automaticAssignment: true,
      socialPlanner: true,
      attendance: false,
      advancedAnalytics: false,
      reports: true,
    },
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthly: 399,
    seatLimit: 30,
    features: [
      "Everything in Pro",
      "Attendance tracking",
      "GPS check-in",
      "Field executive workflows",
      "Advanced analytics",
      "Priority onboarding",
      "Priority support",
      "Win/loss reports",
    ],
    gates: {
      webhookAutomation: true,
      automaticAssignment: true,
      socialPlanner: true,
      attendance: true,
      advancedAnalytics: true,
      reports: true,
    },
  },
];

export function getPlan(planId: PlanId) {
  return PLANS.find((plan) => plan.id === planId) ?? PLANS[0];
}

export function trialDaysRemaining(subscription: OrganizationSubscription) {
  if (!subscription.trialEnd) return 0;
  const ms = new Date(subscription.trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function hasActiveAccess(subscription: OrganizationSubscription) {
  return subscription.status === "active" || subscription.status === "trialing";
}
