import type { Metadata } from "next";
import localFonts from "next/font/local"
import "./globals.css";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const atydisplay = localFonts({
  src:[
    {
      path: "../assets/fonts/AtypDisplay-Regular.woff",
      weight: "400",
      style: "normal"
    },
    {
      path: "../assets/fonts/AtypDisplay-Medium.woff2",
      weight: "500",
      style: "normal"
    },
    {
      path: "../assets/fonts/AtypDisplay-Semibold.woff2",
      weight: "600",
      style: "normal"
    },
  ],
  variable: "--font-atydisplay",
})

export const metadata: Metadata = {
  title: "Rogers Portfolio",
  description: "This is a portfolio site built for Mohammed N. Rogers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${atydisplay.variable} h-full antialiased`}
    >
      <body>
        <Navbar />
        {children}
        <Footer />
        </body>
    </html>
  );
}
