import Link from "next/link";
import { gradientFor } from "@/lib/cms/presentation";
import type { Project } from "@/lib/cms/types";

export default function ProjectsGrid({
  projects,
}: {
  projects?: Project[];
}) {
  const projectList = projects ?? [];

  return (
    <section className="w-full py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {projectList.map((project) => (
          <article
            key={project.id || project.slug}
            className="group flex flex-col justify-between rounded-2xl border border-neutral bg-white shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg overflow-hidden"
          >
            <div>
              {/* Header Visual Box */}
              <div
                className={`relative h-44 w-full bg-gradient-to-br ${gradientFor(
                  project.gradient,
                )} border-b border-neutral flex items-center justify-center p-6 overflow-hidden`}
              >
                {/* Background Tech Pattern */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:16px_16px]" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="font-label text-xs font-semibold uppercase tracking-wider text-black bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-neutral shadow-xs">
                    {project.category}
                  </span>
                  <span className="mt-3 font-headline text-2xl font-black text-black">
                    {project.title}
                  </span>
                </div>

                {/* Metric Badge */}
                {project.metric && (
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm border border-neutral rounded-lg px-2.5 py-1 font-label text-[11px] font-bold text-black shadow-xs">
                    {project.metric.value}
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="p-6">
                <h3 className="font-headline text-lg font-bold text-black mb-2">
                  {project.subtitle}
                </h3>
                <p className="font-body text-sm text-black leading-relaxed mb-6">
                  {project.description}
                </p>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {project.tags.map((tag, idx) => (
                      <span
                        key={tag.id || idx}
                        className="rounded-md border border-neutral bg-neutral/60 px-2.5 py-1 font-label text-[11px] font-medium text-black"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Footer */}
            <div className="border-t border-neutral p-6 pt-4">
              <Link
                href="/contacto"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral bg-white py-2.5 font-body text-sm font-semibold text-black transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                Consultar Solución Similar
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
