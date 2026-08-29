import { Icon } from "@/components/icons";
import {
  ACCENT_BADGE,
  ACCENT_HOVER_BORDER,
  ACCENT_TEXT,
  LAYOUT,
} from "@/lib/cms/presentation";
import type { CmsSectionHeading, Service } from "@/lib/cms/types";

export default function DevelopmentServices({
  heading,
  services,
}: {
  heading?: CmsSectionHeading | null;
  services?: Service[];
}) {
  const eyebrow = heading?.eyebrow ?? "Ingeniería de Software";
  const title = heading?.title ?? "Competencias Principales";
  const description =
    heading?.description ??
    "Equipos de desarrollo especializados dedicados a resolver desafíos técnicos complejos con soluciones elegantes, seguras y escalables.";

  const serviceList = services ?? [];

  return (
    <section className="w-full py-16 sm:py-24" id="servicios">
      <div className="mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-tertiary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-tertiary mb-4">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
          {eyebrow}
        </div>
        <h2 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-2xl font-body text-base text-black sm:text-lg">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {serviceList.map((service) => {
          const hasFeatureDescriptions = service.features?.some(
            (f) => f.description !== null && f.description !== "",
          );

          return (
            <div
              key={service.id || service.slug}
              id={service.anchor ?? undefined}
              className={`group scroll-mt-24 rounded-2xl border border-neutral bg-white p-8 shadow-sm transition-all duration-300 ${ACCENT_HOVER_BORDER[service.accent]} hover:shadow-md ${LAYOUT[service.layout]}`}
            >
              <div>
                <div
                  className={`flex items-center justify-between ${
                    service.layout === "centered" ? "justify-center mb-4" : "mb-6"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center rounded-xl ${
                      service.layout === "centered"
                        ? "h-14 w-14 rounded-2xl"
                        : "h-12 w-12"
                    } ${ACCENT_BADGE[service.accent]} transition-transform group-hover:scale-110`}
                  >
                    <Icon
                      name={service.icon}
                      className={service.layout === "centered" ? "h-7 w-7" : "h-6 w-6"}
                    />
                  </div>
                  {service.badge && service.layout !== "centered" && (
                    <span className="rounded-full bg-neutral px-3 py-1 font-label text-xs font-medium text-black">
                      {service.badge}
                    </span>
                  )}
                </div>

                <h3
                  className={`font-headline text-xl font-bold text-black ${
                    service.layout === "centered" ? "mb-2" : "mb-3"
                  }`}
                >
                  {service.title}
                </h3>
                <p
                  className={`font-body text-sm text-black leading-relaxed ${
                    service.layout === "wide" ? "max-w-2xl" : "mb-6"
                  }`}
                >
                  {service.description}
                </p>
              </div>

              {/* Features with descriptions (e.g. Cloud) */}
              {service.features && service.features.length > 0 && hasFeatureDescriptions && (
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {service.features.map((feature, idx) => (
                    <div
                      key={feature.id || idx}
                      className="rounded-xl border border-neutral bg-neutral/40 p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {feature.marker && (
                          <span
                            className={`${ACCENT_TEXT[feature.accent]} font-bold font-label text-xs`}
                          >
                            {feature.marker}
                          </span>
                        )}
                        <h4 className="font-headline text-sm font-semibold text-black">
                          {feature.label}
                        </h4>
                      </div>
                      {feature.description && (
                        <p className="font-body text-xs text-black">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Features without descriptions (e.g. Web checkmarks) */}
              {service.features && service.features.length > 0 && !hasFeatureDescriptions && (
                <ul className="space-y-2 border-t border-neutral pt-4 font-label text-xs text-black">
                  {service.features.map((feature, idx) => (
                    <li key={feature.id || idx} className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full ${ACCENT_BADGE[feature.accent]} text-[10px]`}
                      >
                        {feature.marker ?? "✓"}
                      </span>
                      {feature.label}
                    </li>
                  ))}
                </ul>
              )}

              {/* Tags (e.g. Mobile) */}
              {service.tags && service.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {service.tags.map((tag, idx) => (
                    <span
                      key={tag.id || idx}
                      className="rounded-lg border border-neutral bg-neutral/60 px-3 py-1.5 font-label text-xs font-medium text-black"
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
