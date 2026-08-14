import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-white font-body">
      <Navbar />
      <main className="flex flex-1 w-full max-w-full flex-col items-center justify-between py-32 px-16 bg-white sm:items-start">
        <Hero/>
      </main>
    </div>
  );
}
