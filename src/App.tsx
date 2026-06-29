import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { analytics } from "./lib/analytics";
import { getPaddleInstance } from "./lib/paddleClient";
import { getPlan, hasActiveAccess, PLANS, trialDaysRemaining, type OrganizationSubscription, type PlanId } from "./lib/plans";
import { supabase } from "./lib/supabaseClient";

type PublicRoute = "landing" | "pricing" | "signin";
type AppTab = "dashboard" | "leads" | "properties" | "followups" | "attendance" | "social" | "reports" | "billing";

interface SessionState {
  userId: string;
  email: string;
  organizationId: string;
  fullName: string;
}

const defaultSubscription: OrganizationSubscription = {
  organizationId: "",
  plan: "basic",
  status: "inactive",
  paddleSubscriptionId: null,
  paddleCustomerId: null,
  renewalDate: null,
  trialEnd: null,
  billingEmail: "",
  seatsUsed: 1,
};

const logos = ["Aster Realty", "NCR Living", "UrbanKey", "Brickline", "HomeLeague"];

function prettyDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function LockBadge({ text }: { text: string }) {
  return <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">{text}</span>;
}

export default function App() {
  const [route, setRoute] = useState<PublicRoute>("landing");
  const [appTab, setAppTab] = useState<AppTab>("dashboard");
  const [session, setSession] = useState<SessionState | null>(null);
  const [subscription, setSubscription] = useState<OrganizationSubscription>(defaultSubscription);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ feature: string } | null>(null);
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    organizationId: "",
  });

  useEffect(() => {
    const cached = localStorage.getItem("realreach-session");
    if (cached) {
      const parsed = JSON.parse(cached) as SessionState;
      setSession(parsed);
      setRoute("landing");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    localStorage.setItem("realreach-session", JSON.stringify(session));
    void refreshSubscription(session.organizationId);
  }, [session]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2200);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!session) {
      analytics.track(route === "pricing" ? "pricing_view" : "landing_view");
    }
  }, [route, session]);

  const currentPlan = getPlan(subscription.plan);
  const trialDays = trialDaysRemaining(subscription);

  const gatedModules = useMemo(
    () => ({
      attendance: currentPlan.gates.attendance,
      social: currentPlan.gates.socialPlanner,
      reports: currentPlan.gates.reports,
      automation: currentPlan.gates.webhookAutomation && currentPlan.gates.automaticAssignment,
    }),
    [currentPlan]
  );

  async function refreshSubscription(organizationId: string) {
    if (!organizationId) return;
    setLoadingSubscription(true);
    try {
      const response = await fetch(`/api/billing/subscription?organizationId=${encodeURIComponent(organizationId)}`);
      if (!response.ok) {
        throw new Error("Could not load subscription");
      }
      const data = await response.json();
      setSubscription({
        organizationId: data.organization_id,
        plan: data.plan,
        status: data.status,
        paddleSubscriptionId: data.subscription_id,
        paddleCustomerId: data.customer_id,
        renewalDate: data.renewal_date,
        trialEnd: data.trial_end,
        billingEmail: data.billing_email,
        seatsUsed: data.seats_used ?? 1,
      });
    } catch {
      setSubscription(defaultSubscription);
      setToast("Subscription lookup failed. Check billing configuration.");
    } finally {
      setLoadingSubscription(false);
    }
  }

  async function openCheckout(plan: PlanId) {
    analytics.track("checkout_started", { plan });

    const organizationId = authForm.organizationId || session?.organizationId || "";
    const email = authForm.email || session?.email || "";
    if (!organizationId || !email) {
      setRoute("signin");
      setToast("Enter organization ID and owner email first.");
      return;
    }

    const response = await fetch("/api/billing/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email, organizationId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Checkout failed" }));
      setToast(payload.error || "Unable to create Paddle checkout");
      return;
    }

    const payload = await response.json();
    analytics.track("checkout_completed", { plan, transaction: payload.transactionId });
    window.location.href = payload.checkoutUrl;
  }

  async function openPaddleInline(plan: PlanId) {
    const paddle = await getPaddleInstance();
    const priceId =
      plan === "basic"
        ? (import.meta as any).env?.VITE_PADDLE_PRICE_BASIC
        : plan === "pro"
        ? (import.meta as any).env?.VITE_PADDLE_PRICE_PRO
        : (import.meta as any).env?.VITE_PADDLE_PRICE_AGENCY;
    if (!paddle || !priceId) {
      setToast("Paddle client token or plan price IDs are missing.");
      return;
    }
    analytics.track("checkout_started", { plan, mode: "overlay" });
    (paddle.Checkout.open as any)({
      items: [{ priceId, quantity: 1 }],
      customData: {
        organization_id: authForm.organizationId || session?.organizationId || "",
      },
      customer: {
        email: authForm.email || session?.email || "",
      },
      settings: {
        displayMode: "overlay",
        theme: "dark",
      },
    });
  }

  async function signIn() {
    if (!authForm.email || !authForm.password || !authForm.organizationId) {
      setToast("Email, password, and organization ID are required.");
      return;
    }

    if (!supabase) {
      setToast("Supabase keys are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    const { error, data } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password,
    });

    if (error || !data.user) {
      setToast(error?.message ?? "Unable to sign in");
      return;
    }

    setSession({
      userId: data.user.id,
      email: authForm.email,
      fullName: authForm.fullName || "Owner",
      organizationId: authForm.organizationId,
    });
    await refreshSubscription(authForm.organizationId);
  }

  async function signUpOwner() {
    if (!authForm.email || !authForm.password || !authForm.organizationId || !authForm.fullName) {
      setToast("Complete all fields to create owner account.");
      return;
    }
    if (!supabase) {
      setToast("Supabase keys are missing.");
      return;
    }
    const { error, data } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: {
        data: {
          full_name: authForm.fullName,
          organization_id: authForm.organizationId,
          role: "admin",
        },
      },
    });
    if (error) {
      setToast(error.message);
      return;
    }
    setSession({
      userId: data.user?.id || crypto.randomUUID(),
      email: authForm.email,
      fullName: authForm.fullName,
      organizationId: authForm.organizationId,
    });
    setToast("Account created. Finish checkout to activate subscription.");
  }

  function requireFeature(enabled: boolean, feature: string) {
    if (enabled) return true;
    setUpgradeModal({ feature });
    return false;
  }

  async function openCustomerPortal() {
    if (!subscription.paddleCustomerId) {
      setToast("Customer ID missing. Wait for Paddle webhook sync.");
      return;
    }
    const response = await fetch("/api/billing/customer-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: subscription.paddleCustomerId }),
    });
    if (!response.ok) {
      setToast("Unable to open customer portal");
      return;
    }
    const payload = await response.json();
    window.location.href = payload.portalUrl;
  }

  function trialBanner() {
    if (subscription.status !== "trialing") return null;
    return (
      <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
        {trialDays > 0
          ? `${trialDays} days left in your trial. Activate billing before trial end to keep automations running.`
          : "Trial ended. Update billing to keep access active."}
      </div>
    );
  }

  const appBlocked = session && !loadingSubscription && !hasActiveAccess(subscription);

  return (
    <div className="min-h-screen bg-[#090b11] text-zinc-100">
      {!session && route === "landing" && (
        <>
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#090b11]/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
              <p className="text-lg font-semibold tracking-tight">RealReach CRM</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setRoute("signin")} className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:text-white">
                  Sign In
                </button>
                <button onClick={() => setRoute("pricing")} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black">
                  Start Free 14-Day Trial
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-5 pb-16 pt-10">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#141726] to-[#0d0f17] p-7 md:p-12">
              <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
              <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                Your Next Lead Should Be Talking to an Agent in Under 60 Seconds.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="mt-4 max-w-2xl text-zinc-300"
              >
                RealReach routes every enquiry instantly, starts bridge calls, shares properties in one tap, and keeps managers in control of follow-ups, inventory, and team activity.
              </motion.p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => setRoute("pricing")} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">
                  Start Free 14-Day Trial
                </button>
                <button onClick={() => setRoute("signin")} className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold">
                  Sign In
                </button>
              </div>
              <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-400">Live Dashboard Preview</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ["Leads in Last Hour", "34"],
                    ["Avg First Contact", "47 sec"],
                    ["Follow-ups Due", "19"],
                    ["Bridge Calls Today", "86"],
                  ].map(([label, value]) => (
                    <motion.div whileHover={{ y: -2 }} key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-zinc-400">{label}</p>
                      <p className="text-xl font-semibold">{value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-5 text-xs text-zinc-400">
                {logos.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            </section>

            <section className="mt-16">
              <h2 className="text-2xl font-semibold">Where Agencies Lose Deals</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  "Leads go cold because nobody calls fast enough.",
                  "Sales agents forget follow-ups across multiple channels.",
                  "WhatsApp conversations become impossible to track.",
                  "Managers have no visibility into response performance.",
                  "Inventory sits in disconnected spreadsheets.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-zinc-300">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-16">
              <h2 className="text-2xl font-semibold">How RealReach Solves It</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  "Automatic Lead Assignment",
                  "Bridge Calling",
                  "Property Sharing",
                  "Follow-up Automation",
                  "Attendance Tracking",
                  "Analytics",
                  "Social Planning",
                ].map((item) => (
                  <motion.div whileHover={{ scale: 1.01 }} key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                    {item}
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="mt-16 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-6">
              <h2 className="text-2xl font-semibold">Speed to Lead Wins Deals</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-sm font-semibold text-zinc-300">Manual Process</p>
                  {[
                    "Receive lead",
                    "Copy number",
                    "Find agent",
                    "Call later",
                    "Lost opportunity",
                  ].map((step) => (
                    <p key={step} className="text-sm text-zinc-400">
                      {step}
                    </p>
                  ))}
                </div>
                <div className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-4">
                  <p className="mb-2 text-sm font-semibold text-indigo-100">RealReach</p>
                  {[
                    "Lead received",
                    "Assigned instantly",
                    "Agent called",
                    "Lead connected",
                    "Timeline updated",
                    "Everything automatically logged",
                  ].map((step) => (
                    <p key={step} className="text-sm text-indigo-100/90">
                      {step}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-16 grid gap-4 md:grid-cols-2">
              <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="mb-2 text-sm font-semibold">Desktop Operations View</p>
                <p className="text-sm text-zinc-400">Call timelines, lead source performance, and property shares in one command center.</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="mb-2 text-sm font-semibold">Mobile Field View</p>
                <p className="text-sm text-zinc-400">Quick call, WhatsApp follow-up, check-in, and property send from your phone.</p>
              </motion.div>
            </section>

            <section className="mt-16">
              <h2 className="text-2xl font-semibold">What Agencies Say</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  "We cut first response time from 11 minutes to under one minute.",
                  "Managers finally see who followed up and who dropped the ball.",
                  "Our sales team stopped switching between spreadsheets and WhatsApp.",
                ].map((quote) => (
                  <div key={quote} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
                    {quote}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-16">
              <h2 className="text-2xl font-semibold">FAQ</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["How does billing work?", "Monthly Paddle subscription. Plan changes use proration automatically."],
                  ["Is our data secure?", "Organization-scoped data access with row-level security and signed webhooks."],
                  ["Which integrations are supported?", "Twilio Voice/WhatsApp, Supabase, Paddle, and analytics adapters."],
                  ["Can we cancel anytime?", "Yes. Cancellation and portal actions are handled in Paddle customer portal."],
                  ["Who owns the data?", "Your organization retains full ownership and can export at any time."],
                ].map(([q, a]) => (
                  <div key={q} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-medium">{q}</p>
                    <p className="mt-1 text-sm text-zinc-400">{a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-600/25 to-cyan-500/15 p-8 text-center">
              <h3 className="text-2xl font-semibold">Start routing leads in under an hour.</h3>
              <p className="mt-2 text-zinc-300">RealReach is built for agencies that want every enquiry handled before competitors call back.</p>
              <button onClick={() => setRoute("pricing")} className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">
                Start Free 14-Day Trial
              </button>
            </section>
          </main>

          <footer className="border-t border-white/10 px-5 py-8 text-sm text-zinc-400">
            <div className="mx-auto flex max-w-6xl flex-wrap gap-4">
              {[
                "Privacy",
                "Terms",
                "Contact",
                "Pricing",
                "Login",
                "Documentation",
              ].map((item) => (
                <button key={item} className="hover:text-white">
                  {item}
                </button>
              ))}
            </div>
          </footer>
        </>
      )}

      {!session && route === "pricing" && (
        <main className="mx-auto max-w-6xl px-5 py-12">
          <div className="mb-8 flex items-center justify-between">
            <button onClick={() => setRoute("landing")} className="text-sm text-zinc-400 hover:text-white">
              Back
            </button>
            <button onClick={() => setRoute("signin")} className="text-sm text-zinc-300 hover:text-white">
              Sign In
            </button>
          </div>
          <h1 className="text-center text-4xl font-semibold">Plans Built for Real Estate Teams</h1>
          <p className="mt-3 text-center text-zinc-400">Speed to lead automation reduces manual work so your team responds faster to every enquiry.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <motion.div key={plan.id} whileHover={{ y: -4 }} className={`rounded-2xl border p-5 ${plan.id === "pro" ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 bg-white/[0.03]"}`}>
                {plan.highlight && <p className="mb-2 inline-flex rounded-full bg-indigo-500/30 px-3 py-1 text-xs">{`STAR ${plan.highlight}`}</p>}
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 text-3xl font-semibold">${plan.priceMonthly}<span className="text-base text-zinc-400">/month</span></p>
                <p className="mt-1 text-sm text-zinc-400">Maximum {plan.seatLimit} users</p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                  {plan.features.map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
                <button onClick={() => openCheckout(plan.id)} className="mt-5 h-11 w-full rounded-xl bg-white text-sm font-semibold text-black">
                  Choose {plan.name}
                </button>
                <button onClick={() => openPaddleInline(plan.id)} className="mt-2 h-11 w-full rounded-xl border border-white/20 text-sm">
                  Quick Overlay Checkout
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Basic</th>
                  <th className="px-4 py-3 text-indigo-200">Pro</th>
                  <th className="px-4 py-3">Agency</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Webhook Lead Intake", false, true, true],
                  ["Automated Lead Assignment", false, true, true],
                  ["Call Automation", false, true, true],
                  ["Team Analytics", false, true, true],
                  ["Attendance", false, false, true],
                ].map(([label, b, p, a]) => (
                  <tr key={label as string} className="border-t border-white/10 text-zinc-300">
                    <td className="px-4 py-3">{label as string}</td>
                    <td className="px-4 py-3">{b ? "check" : "-"}</td>
                    <td className="px-4 py-3 text-indigo-200">{p ? "check" : "-"}</td>
                    <td className="px-4 py-3">{a ? "check" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {!session && route === "signin" && (
        <main className="mx-auto grid min-h-screen max-w-6xl items-center px-5 py-10 md:grid-cols-2 md:gap-10">
          <section>
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Owner Authentication</p>
            <h1 className="mt-2 text-4xl font-semibold">Sign in or create your organization owner account</h1>
            <p className="mt-3 text-zinc-400">Access is granted only to organizations with an active Paddle subscription or trial.</p>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="space-y-3">
              <input className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3" placeholder="Full name" value={authForm.fullName} onChange={(e) => setAuthForm((s) => ({ ...s, fullName: e.target.value }))} />
              <input className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3" placeholder="Work email" value={authForm.email} onChange={(e) => setAuthForm((s) => ({ ...s, email: e.target.value }))} />
              <input className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3" placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm((s) => ({ ...s, password: e.target.value }))} />
              <input className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3" placeholder="Organization ID" value={authForm.organizationId} onChange={(e) => setAuthForm((s) => ({ ...s, organizationId: e.target.value }))} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={signIn} className="h-11 rounded-xl border border-white/20">Sign In</button>
              <button onClick={signUpOwner} className="h-11 rounded-xl bg-white font-semibold text-black">Create Owner</button>
            </div>
            <button onClick={() => setRoute("pricing")} className="mt-3 h-11 w-full rounded-xl bg-indigo-500/80 font-semibold">
              Continue to Plan Selection
            </button>
          </section>
        </main>
      )}

      {session && (
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-20 pt-5">
          <header className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">RealReach CRM</p>
              <p className="text-sm text-zinc-300">{session.fullName} • Org {session.organizationId}</p>
            </div>
            <div className="flex items-center gap-2">
              <LockBadge text={subscription.plan.toUpperCase()} />
              <LockBadge text={subscription.status} />
              <button
                onClick={() => {
                  localStorage.removeItem("realreach-session");
                  setSession(null);
                  setRoute("landing");
                }}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs"
              >
                Sign Out
              </button>
            </div>
          </header>

          {trialBanner()}

          {appBlocked && (
            <div className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5">
              <p className="text-lg font-semibold">Subscription Required</p>
              <p className="mt-2 text-sm text-zinc-300">Your subscription is inactive. RealReach preserves your data and routes admins to Billing to restore access.</p>
              <button onClick={() => setAppTab("billing")} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">Go to Billing</button>
            </div>
          )}

          {!appBlocked && (
            <main className="mt-4 space-y-4">
              {appTab === "dashboard" && (
                <section className="grid gap-3 md:grid-cols-3">
                  {[
                    ["New leads today", 28],
                    ["Calls made today", 71],
                    ["Follow-ups due", 14],
                    ["Hot leads", 9],
                    ["Site visits", 6],
                    ["Available inventory", 54],
                  ].map(([label, value]) => (
                    <motion.div key={label as string} whileHover={{ y: -3 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm text-zinc-400">{label as string}</p>
                      <p className="mt-2 text-2xl font-semibold">{value as number}</p>
                    </motion.div>
                  ))}
                  <div className="rounded-2xl border border-indigo-400/35 bg-indigo-500/10 p-4 md:col-span-3">
                    <p className="text-sm font-semibold">Speed to Lead Workflow</p>
                    <p className="mt-1 text-sm text-zinc-300">Lead received to assigned instantly to agent bridge call to timeline logged to follow-up queued.</p>
                  </div>
                </section>
              )}

              {appTab === "leads" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-lg font-semibold">Lead Command Center</p>
                  <p className="mt-2 text-sm text-zinc-400">One-click call, one-click follow-up, one-click property share with complete activity timeline.</p>
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <button className="h-11 rounded-xl border border-white/20">Call Lead</button>
                    <button className="h-11 rounded-xl border border-white/20">WhatsApp Follow-up</button>
                    <button className="h-11 rounded-xl border border-white/20">Share Property</button>
                  </div>
                  <button
                    onClick={() => {
                      if (!requireFeature(gatedModules.automation, "Webhook Lead Intake + Automated Assignment")) return;
                      setToast("Automation pipeline ready. Use /api/webhooks/leads endpoint.");
                    }}
                    className="mt-4 rounded-xl bg-indigo-500/80 px-4 py-2 text-sm font-semibold"
                  >
                    Trigger Automation Capability
                  </button>
                </section>
              )}

              {appTab === "properties" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-lg font-semibold">Inventory</p>
                  <p className="mt-2 text-sm text-zinc-400">Manage photos, brochures, availability, and quick-share links for buyers.</p>
                </section>
              )}

              {appTab === "followups" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-lg font-semibold">Follow-up Queue</p>
                  <p className="mt-2 text-sm text-zinc-400">Templates, reminders, and completion tracking across WhatsApp, SMS, email, and calls.</p>
                </section>
              )}

              {appTab === "attendance" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {gatedModules.attendance ? (
                    <>
                      <p className="text-lg font-semibold">Attendance</p>
                      <p className="mt-2 text-sm text-zinc-400">Track check-ins, field movement, and late/absent status in real time.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">Attendance</p>
                      <p className="mt-2 text-sm text-zinc-400">Upgrade to Agency for GPS check-ins, field executive routing, and attendance controls.</p>
                      <button onClick={() => setUpgradeModal({ feature: "Attendance + GPS Check-ins" })} className="mt-3 rounded-xl border border-white/20 px-4 py-2 text-sm">Upgrade to unlock</button>
                    </>
                  )}
                </section>
              )}

              {appTab === "social" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {gatedModules.social ? (
                    <>
                      <p className="text-lg font-semibold">Social Planner</p>
                      <p className="mt-2 text-sm text-zinc-400">Plan campaigns, assign posts, and sync approval workflows.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">Social Planner</p>
                      <p className="mt-2 text-sm text-zinc-400">Pro unlocks scheduling, templates, and calendar collaboration for your marketing team.</p>
                      <button onClick={() => setUpgradeModal({ feature: "Social Media Planner" })} className="mt-3 rounded-xl border border-white/20 px-4 py-2 text-sm">Upgrade to unlock</button>
                    </>
                  )}
                </section>
              )}

              {appTab === "reports" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {gatedModules.reports ? (
                    <>
                      <p className="text-lg font-semibold">Reports</p>
                      <p className="mt-2 text-sm text-zinc-400">Leads by source, win/loss trends, agent performance, and conversion velocity.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold">Reports</p>
                      <p className="mt-2 text-sm text-zinc-400">Upgrade to Pro or Agency for conversion analytics, team performance, and funnel visibility.</p>
                      <button onClick={() => setUpgradeModal({ feature: "Performance Reports" })} className="mt-3 rounded-xl border border-white/20 px-4 py-2 text-sm">Upgrade to unlock</button>
                    </>
                  )}
                </section>
              )}

              {appTab === "billing" && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-lg font-semibold">Billing</p>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <p>Current Plan: {currentPlan.name}</p>
                    <p>Renewal Date: {prettyDate(subscription.renewalDate)}</p>
                    <p>Seats Used: {subscription.seatsUsed}/{currentPlan.seatLimit}</p>
                    <p>Billing Email: {subscription.billingEmail || session.email}</p>
                    <p>Status: {subscription.status}</p>
                    <p>Trial Ends: {prettyDate(subscription.trialEnd)}</p>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    <button onClick={() => openCheckout("pro")} className="h-11 rounded-xl bg-indigo-500/80 text-sm font-semibold">Upgrade Plan</button>
                    <button onClick={() => openCheckout("basic")} className="h-11 rounded-xl border border-white/20 text-sm">Downgrade Plan</button>
                    <button onClick={openCustomerPortal} className="h-11 rounded-xl border border-white/20 text-sm">Manage Subscription</button>
                    <button onClick={openCustomerPortal} className="h-11 rounded-xl border border-white/20 text-sm">Download Invoices</button>
                    <button onClick={openCustomerPortal} className="h-11 rounded-xl border border-white/20 text-sm">Update Payment Method</button>
                    <button onClick={openCustomerPortal} className="h-11 rounded-xl border border-red-400/40 text-sm text-red-200">Cancel Subscription</button>
                  </div>
                </section>
              )}
            </main>
          )}

          <nav className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#090b11]/95 px-3 py-2 backdrop-blur">
            <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 md:grid-cols-8">
              {[
                ["dashboard", "Dashboard"],
                ["leads", "Leads"],
                ["properties", "Properties"],
                ["followups", "Follow-ups"],
                ["attendance", "Attendance"],
                ["social", "Social"],
                ["reports", "Reports"],
                ["billing", "Billing"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setAppTab(id as AppTab)}
                  className={`h-11 rounded-xl text-xs ${appTab === id ? "bg-white text-black" : "text-zinc-400"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}

      <AnimatePresence>
        {upgradeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111524] p-5">
              <p className="text-lg font-semibold">Unlock {upgradeModal.feature}</p>
              <p className="mt-2 text-sm text-zinc-300">This capability is available on higher plans because it requires automation services and team-level orchestration.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => setUpgradeModal(null)} className="h-10 rounded-xl border border-white/20">Not Now</button>
                <button
                  onClick={() => {
                    setUpgradeModal(null);
                    setAppTab("billing");
                  }}
                  className="h-10 rounded-xl bg-white font-semibold text-black"
                >
                  View Plans
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
