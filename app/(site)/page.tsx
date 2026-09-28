import CallToAction from "@/sections/CallToAction";
import Experience from "@/sections/Experience";
import Hero from "@/sections/Hero";
import LogoTicker from "@/sections/LogoTicker";
import Project from "@/sections/Project";
import Testimonials from "@/sections/Testimonials";

export default function Home () {
  return (
    <>
      <Hero />
      <LogoTicker />
      <Project />
      <Testimonials />
      <Experience />
      <CallToAction />
    </>
  )
}