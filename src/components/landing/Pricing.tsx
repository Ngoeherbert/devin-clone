import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    blurb: "For trying things out",
    cta: "Get started",
    highlighted: false,
    features: [
      "5 agent sessions / month",
      "Canvas and design workspace",
      "Community support",
    ],
  },
  {
    name: "Team",
    price: "$28",
    period: " / seat / mo",
    blurb: "For teams shipping together",
    cta: "Start free trial",
    highlighted: true,
    features: [
      "Unlimited agent sessions",
      "GitHub, Slack, Linear, Jira",
      "Shared library and canvas",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "For larger orgs and security needs",
    cta: "Contact sales",
    highlighted: false,
    features: ["SSO and audit logs", "Dedicated support", "Custom usage limits"],
  },
];

export function Pricing() {
  return (
    <div id="pricing" className="border-t border-border px-6 py-14">
      <div className="mb-8 text-center">
        <h2 className="mb-1.5 text-[22px] font-medium">Simple pricing</h2>
        <p className="text-[13px] text-text-secondary">
          Start free. Upgrade when your team needs more.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3.5 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "relative rounded-xl border bg-surface-1 p-5",
              plan.highlighted ? "border-2 border-border-accent" : "border-border"
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-md bg-bg-accent px-2.5 py-0.5 text-[11px] text-text-accent">
                Most popular
              </span>
            )}
            <p className="mt-1 text-[13px] text-text-secondary">{plan.name}</p>
            <p className="mb-1 mt-1 text-[26px] font-medium">
              {plan.price}
              {plan.period && (
                <span className="text-[13px] font-normal text-text-secondary">
                  {plan.period}
                </span>
              )}
            </p>
            <p className="mb-4 text-xs text-text-muted">{plan.blurb}</p>
            <Button
              className="mb-4 w-full"
              variant={plan.highlighted ? "default" : "secondary"}
            >
              {plan.cta}
            </Button>
            <div className="flex flex-col gap-2">
              {plan.features.map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-1.5 text-[12.5px] text-text-secondary"
                >
                  <Check className="size-3.5 shrink-0 text-text-success" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
