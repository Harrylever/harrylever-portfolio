import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { Inter, Outfit } from "next/font/google";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const outfitHeading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  authors: [
    {
      name: "Dean Ukanah",
      url: "https://www.deanukanah.dev",
    },
  ],
  creator: "Dean Onesi Ukanah",
  publisher: "Dean Onesi Ukanah @ Vercel",
  applicationName: "Dean's Portfolio",
  generator: "Next.js",
  keywords: [
    "Harrylever",
    "Dean Ukanah",
    "Dean Onesi Ukanah",
    "Indie Hacker",
    "Software Engineer",
    "Full-Stack Engineer",
    "Product Engineering",
    "Cybersecurity",
    "Next.js",
    "React",
    "Solana",
    "Rust",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  metadataBase: new URL("https://www.deanukanah.dev"),
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: "https://www.deanukanah.dev",
    siteName: siteConfig.name,
    images: [
      {
        url: "https://www.deanukanah.dev/deanukanah.jpg",
        width: 620,
        height: 620,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-US",
    },
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: { url: "https://www.deanukanah.dev/deanukanah.jpg" },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={cn("font-sans", inter.variable, outfitHeading.variable)}
      lang="en"
    >
      <head />
      <body className={clsx("min-h-screen font-sans antialiased")}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
