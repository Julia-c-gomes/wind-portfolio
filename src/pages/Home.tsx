import { Catalogue } from "@/components/catalogue/Catalogue"
import { Contact, Ticker } from "@/components/Contact"
import { Hero } from "@/components/hero/Hero"

export default function Home() {
  return (
    <main>
      <Hero />
      <Ticker />
      <Catalogue />
      <Contact />
    </main>
  )
}
