import { Navigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/landing/Footer";
import { staticPages } from "@/pages/static/content";

export function StaticPage({ slug }: { slug: string }) {
  const page = staticPages[slug];

  if (!page) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <LandingNav />

      <div className="mx-auto max-w-2xl px-6 py-14">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Back home
        </Link>

        <h1 className="mb-1.5 text-[26px] font-medium">{page.title}</h1>
        {page.subtitle && (
          <p className="mb-1 text-[14px] text-text-secondary">{page.subtitle}</p>
        )}
        {page.updated && <p className="mb-8 text-[12px] text-text-muted">{page.updated}</p>}
        {!page.updated && <div className="mb-8" />}

        <div className="flex flex-col gap-7">
          {page.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h2 className="mb-2 text-[15px] font-medium">{section.heading}</h2>
              )}
              <div className="flex flex-col gap-3">
                {section.body.map((para, j) => (
                  <p key={j} className="text-[13.5px] leading-relaxed text-text-secondary">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
