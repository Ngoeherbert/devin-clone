import { Link } from "react-router-dom";
import { Zap, AtSign, FolderGit2, Users } from "lucide-react";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Agent workspace", to: "/#features" },
      { label: "Canvas", to: "/#features" },
      { label: "Design", to: "/#features" },
      { label: "Integrations", to: "/#features" },
      { label: "Pricing", to: "/#pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Blog", to: "/blog" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", to: "/docs" },
      { label: "Changelog", to: "/changelog" },
      { label: "Status", to: "/status" },
      { label: "Community", to: "/community" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", to: "/privacy" },
      { label: "Terms of service", to: "/terms" },
      { label: "Security", to: "/security" },
    ],
  },
];

export function Footer() {
  return (
    <div className="border-t border-border px-6 pt-10">
      <div className="mb-8 grid grid-cols-2 gap-6 sm:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="col-span-2 sm:col-span-1">
          <div className="mb-2.5 flex items-center gap-2 text-sm font-medium">
            <span className="flex size-[22px] items-center justify-center rounded-md bg-text-primary">
              <Zap className="size-[13px] text-surface-2" />
            </span>
            Omni
          </div>
          <p className="mb-3.5 max-w-[220px] text-[12.5px] leading-relaxed text-text-secondary">
            The AI teammate that plans, builds, and ships alongside your team.
          </p>
          <div className="flex gap-2">
            <a
              href="#"
              aria-label="X"
              className="flex size-[30px] items-center justify-center rounded-md border border-border text-text-secondary hover:text-text-primary"
            >
              <AtSign className="size-[14px]" />
            </a>
            <a
              href="#"
              aria-label="GitHub"
              className="flex size-[30px] items-center justify-center rounded-md border border-border text-text-secondary hover:text-text-primary"
            >
              <FolderGit2 className="size-[14px]" />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="flex size-[30px] items-center justify-center rounded-md border border-border text-text-secondary hover:text-text-primary"
            >
              <Users className="size-[14px]" />
            </a>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <p className="mb-2.5 text-xs font-medium text-text-primary">{col.heading}</p>
            <div className="flex flex-col gap-2">
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-[12.5px] text-text-secondary hover:text-text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border py-4">
        <span className="text-[11.5px] text-text-muted">
          © {new Date().getFullYear()} Omni. All rights reserved.
        </span>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-text-success" />
          <span className="text-[11.5px] text-text-secondary">All systems operational</span>
        </div>
      </div>
    </div>
  );
}
