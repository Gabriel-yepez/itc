import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import LegalContent from "@/components/LegalContent";
import Navbar from "@/components/Navbar";
import { buildMetadata } from "@/lib/cms/metadata";
import { getLegalPage } from "@/lib/cms/queries";

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:legal-pages", "cms:legal-page:terminos");
  const page = await getLegalPage("terminos");
  return buildMetadata(page?.seo ?? null, "/terminos");
}

export default async function TerminosPage() {
  const page = await getLegalPage("terminos");

  if (!page) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 font-label text-xs font-semibold uppercase tracking-wider text-secondary mb-4">
            Legal & Acuerdos
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-black sm:text-4xl lg:text-5xl mb-4">
            {page.title}
          </h1>
          {page.effectiveDate && (
            <p className="font-label text-xs text-black">
              Última actualización: {page.effectiveDate}
            </p>
          )}
        </div>

        <LegalContent content={page.content} />
      </main>

      <Footer />
    </div>
  );
}
