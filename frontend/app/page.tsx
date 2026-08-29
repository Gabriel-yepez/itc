import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import AboutUs from "@/components/AboutUs";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import OurClients from "@/components/OurClients";
import { buildMetadata } from "@/lib/cms/metadata";
import { getClients, getHomePage } from "@/lib/cms/queries";

export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheLife("hourly");
  cacheTag("cms", "cms:home-page");
  const page = await getHomePage();
  return buildMetadata(page?.seo ?? null, "/");
}

export default async function Home() {
  const [homePage, clients] = await Promise.all([
    getHomePage(),
    getClients(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <Hero hero={homePage?.hero} />
        <AboutUs about={homePage?.about} />
        <OurClients heading={homePage?.clientsHeading} clients={clients} />
      </main>
      <Footer />
    </div>
  );
}
