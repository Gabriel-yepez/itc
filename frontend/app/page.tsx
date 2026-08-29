import AboutUs from "@/components/AboutUs";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import OurClients from "@/components/OurClients";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-12 sm:px-12 lg:px-16">
        <Hero />
        <AboutUs />
        <OurClients />
      </main>
      <Footer />
    </div>
  );
}
