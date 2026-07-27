import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "It picks up tickets from our backlog and opens clean PRs before I've finished my coffee.",
    name: "Amara K.",
    role: "Staff engineer, fintech",
    initials: "AK",
    tone: "accent" as const,
  },
  {
    quote:
      "The canvas workspace turned a messy whiteboard session into an ER diagram everyone could actually read.",
    name: "Tunde N.",
    role: "Founder, small SaaS team",
    initials: "TN",
    tone: "success" as const,
  },
  {
    quote:
      "Design mode is the fastest way I've found to go from a rough idea to a screen I can hand to my dev.",
    name: "Rosine S.",
    role: "Product designer",
    initials: "RS",
    tone: "danger" as const,
  },
];

const toneClasses = {
  accent: "bg-bg-accent text-text-accent",
  success: "bg-bg-success text-text-success",
  danger: "bg-bg-danger text-text-danger",
};

export function Testimonials() {
  return (
    <div className="border-t border-border px-6 py-14">
      <div className="mb-8 text-center">
        <h2 className="mb-1.5 text-[22px] font-medium">Teams shipping with Omni</h2>
        <p className="text-[13px] text-text-secondary">
          A few words from people using it every day.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3.5 sm:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.name} className="rounded-xl border border-border bg-surface-2 p-4.5">
            <div className="mb-2.5 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-current text-text-warning" />
              ))}
            </div>
            <p className="mb-3.5 text-[12.5px] leading-relaxed text-text-secondary">
              {t.quote}
            </p>
            <div className="flex items-center gap-2">
              <div
                className={`flex size-[30px] items-center justify-center rounded-full text-[11px] font-medium ${toneClasses[t.tone]}`}
              >
                {t.initials}
              </div>
              <div>
                <p className="text-[12.5px] font-medium">{t.name}</p>
                <p className="text-[11px] text-text-muted">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
