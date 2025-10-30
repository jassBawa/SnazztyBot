import { HeroSection } from "@/components/HeroSection";
import { DevnetSection } from "@/components/DevnetSection";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />
      <main className="relative overflow-hidden">
        <HeroSection />
        <DevnetSection />
      </main>
    </div>
  );
}
