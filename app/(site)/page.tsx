import LetsWorkCTA from "@/sections/LetsWorkCTA";
import Experience from "@/sections/Experience";
import Hero from "@/sections/Hero";
import LogoTicker from "@/sections/LogoTicker";
import Project from "@/sections/Project";
import Testimonials from "@/sections/Testimonials";
import type { Metadata } from "next";
import Portrait from "@/assets/images/hero-image.png";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata, personJsonLd, websiteJsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: { absolute: site.title },
  description: site.description,
  path: "/",
});

export default function Home () {
  return (
    <>
      <JsonLd nodes={[websiteJsonLd(), personJsonLd(absoluteUrl(Portrait.src))]} />
      <Hero />
      <LogoTicker />
      <Project />
      <Testimonials />
      <Experience />
      <LetsWorkCTA />
    </>
  )
}