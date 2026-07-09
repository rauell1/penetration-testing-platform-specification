import Link from "next/link";
import { notFound } from "next/navigation";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { SPEC_SECTIONS, findSpec } from "@/spec/content";

export function generateStaticParams() {
  return SPEC_SECTIONS.map((s) => ({ slug: s.slug }));
}

export default async function SpecSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = findSpec(slug);
  if (!section) notFound();

  const idx = SPEC_SECTIONS.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? SPEC_SECTIONS[idx - 1] : null;
  const next = idx < SPEC_SECTIONS.length - 1 ? SPEC_SECTIONS[idx + 1] : null;

  return (
    <Shell activePath={`/spec/${slug}`}>
      <PageHeader
        eyebrow={`Section ${section.number} · ${section.eyebrow}`}
        title={section.title}
        description={section.summary}
        actions={
          <Link
            href="/spec"
            className="rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 px-3.5 py-2 text-sm"
          >
            ← All sections
          </Link>
        }
      />
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 space-y-6">
        <SectionCard>
          <article className="prose-invert">{section.body}</article>
        </SectionCard>

        <div className="grid md:grid-cols-2 gap-3 pt-4">
          {prev ? (
            <Link
              href={`/spec/${prev.slug}`}
              className="rounded-lg border border-slate-800 hover:border-sky-500/40 p-4 bg-[#0a0f1c]/60 transition"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                ← Previous
              </div>
              <div className="text-slate-200 font-semibold">
                {prev.number}. {prev.title}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/spec/${next.slug}`}
              className="rounded-lg border border-slate-800 hover:border-sky-500/40 p-4 bg-[#0a0f1c]/60 transition md:text-right"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Next →
              </div>
              <div className="text-slate-200 font-semibold">
                {next.number}. {next.title}
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </Shell>
  );
}
