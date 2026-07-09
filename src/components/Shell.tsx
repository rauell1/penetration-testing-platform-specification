import Link from "next/link";
import { ReactNode } from "react";

const NAV_SECTIONS: Array<{
  title: string;
  items: Array<{ href: string; label: string; badge?: string }>;
}> = [
  {
    title: "Live demo",
    items: [
      { href: "/", label: "Overview" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/targets", label: "Targets" },
      { href: "/scans", label: "Scan Runs" },
      { href: "/findings", label: "Findings" },
      { href: "/audit", label: "Audit log" },
    ],
  },
  {
    title: "Blueprint",
    items: [
      { href: "/spec", label: "Table of contents" },
      { href: "/spec/interactive", label: "Interactive Showcase", badge: "NEW" },
      { href: "/spec/architecture", label: "1. Architecture" },
      { href: "/spec/threat-model", label: "2. Threat model" },
      { href: "/spec/legal", label: "3. Legal & authorization" },
      { href: "/spec/schema", label: "4. Database schema" },
      { href: "/spec/tenancy", label: "5. Multi-tenancy" },
      { href: "/spec/repo", label: "6. Repo structure" },
      { href: "/spec/queue", label: "7. Queue & workers" },
      { href: "/spec/pipeline", label: "8. Scan pipeline" },
      { href: "/spec/crawler", label: "9. Crawler design" },
      { href: "/spec/passive", label: "10. Passive engine" },
      { href: "/spec/active", label: "11. Active engine" },
      { href: "/spec/auth-scan", label: "12. Authenticated scans" },
      { href: "/spec/adapters", label: "13. Scanner adapters" },
      { href: "/spec/normalization", label: "14. Normalization" },
      { href: "/spec/api", label: "15. API design" },
      { href: "/spec/rbac", label: "16. RBAC & secrets" },
      { href: "/spec/evidence", label: "17. Evidence & audit" },
      { href: "/spec/ui", label: "18. UI architecture" },
      { href: "/spec/testing", label: "19. Testing strategy" },
      { href: "/spec/roadmap", label: "20. Phased roadmap" },
      { href: "/spec/closing", label: "★ Closing checklists" },
    ],
  },
];

export default function Shell({
  children,
  activePath,
}: {
  children: ReactNode;
  activePath?: string;
}) {
  return (
    <div className="min-h-screen flex bg-zinc-950">
      <aside className="hidden lg:flex w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-950 flex-col">
        <div className="px-5 pt-6 pb-4 border-b border-zinc-800/80">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-zinc-950 font-black text-sm glow">
              S
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-zinc-100 group-hover:text-white">
                SentinelDAST
              </div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400/80">
                authorized · WSTG-aligned
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                   const active = activePath === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          "block px-3 py-1.5 rounded-md text-sm transition",
                          active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent",
                        ].join(" ")}
                      >
                        {item.label}
                        {item.badge && (
                          <span className="ml-2 text-[9px] uppercase tracking-widest text-emerald-400 font-semibold">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-zinc-800/80 text-[10px] text-zinc-500 leading-relaxed">
          Passive by default · Active requires verified target + explicit
          opt-in · Every request scope-checked in-worker.
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 py-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-zinc-950 font-black text-xs">
            S
          </div>
          <span className="font-semibold text-zinc-100">SentinelDAST</span>
          <Link href="/spec" className="ml-auto text-xs text-emerald-400 hover:underline">
            spec
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/40 to-transparent">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-10 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/90 font-semibold mb-2">
                {eyebrow}
              </div>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold text-zinc-50 leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-zinc-400 max-w-3xl">{description}</p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur ${className}`}
    >
      {(title || eyebrow) && (
        <header className="px-5 py-4 border-b border-zinc-800/80">
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-widest text-emerald-400/90 font-semibold mb-1">
              {eyebrow}
            </div>
          )}
          {title && (
            <h2 className="text-zinc-100 font-semibold">{title}</h2>
          )}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
