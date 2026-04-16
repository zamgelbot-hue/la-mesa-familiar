import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { GamesSection } from "@/components/games-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { FeaturesSection } from "@/components/features-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <GamesSection />
      <HowItWorksSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
