import { Bot, Waypoints, Palette } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Agent workspace",
    body: "Plans, codes, tests, and opens a PR while you review its work.",
  },
  {
    icon: Waypoints,
    title: "Canvas",
    body: "Sketch architecture, UML, and ER diagrams together in chat.",
  },
  {
    icon: Palette,
    title: "Design",
    body: "Draft UI screens and iterate on them right on the canvas.",
  },
];

export function Features() {
  return (
    <div id="features" className="border-t border-border px-6 py-10">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl bg-surface-1 p-4.5">
            <f.icon className="size-5 text-text-accent" />
            <p className="mb-1 mt-2.5 text-[14px] font-medium">{f.title}</p>
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
