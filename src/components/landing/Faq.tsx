import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes 5 agent sessions a month plus full access to canvas and design mode, no card required.",
  },
  {
    q: "Which tools does it integrate with?",
    a: "GitHub, Slack, Linear, and Jira today, with more integrations on the way.",
  },
  {
    q: "Can Omni open pull requests on its own?",
    a: "It plans, codes, tests, and opens a draft PR for you to review, it never merges without your approval.",
  },
  {
    q: "What's the difference between Canvas and Design?",
    a: "Canvas is for architecture and data diagrams like UML and ER models. Design is for drafting UI screens.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, plans are month to month and you can cancel from account settings at any time.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div id="faq" className="border-t border-border px-6 py-14">
      <h2 className="mb-8 text-center text-[22px] font-medium">
        Frequently asked questions
      </h2>

      <div className="mx-auto flex max-w-xl flex-col gap-2">
        {faqs.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} className="rounded-md border border-border px-3.5 py-3">
              <button
                onClick={() => setOpenIndex(open ? -1 : i)}
                className="flex w-full items-center justify-between text-left text-[13px] font-medium"
              >
                {item.q}
                <ChevronDown
                  className={cn(
                    "size-[15px] text-text-secondary transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              {open && (
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-text-secondary">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
