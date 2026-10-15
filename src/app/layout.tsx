import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";

import clsx from "clsx";
import { Inter, Outfit } from "next/font/google";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPublishedSiteProfile } from "@/server/content/public";

const outfitHeading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getPublishedSiteProfile();
  const name = profile?.name ?? siteConfig.name;
  const tagline = profile?.tagline ?? siteConfig.tagline;
  const description = profile?.description ?? siteConfig.description;

  return {
    title: {
      default: `${name} — ${tagline}`,
      template: `%s — ${name}`,
    },
    authors: [{ name, url: siteConfig.url }],
    creator: name,
    publisher: `${name} @ Vercel`,
    applicationName: `${name}'s Portfolio`,
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
      googleBot: { index: true, follow: true },
    },
    metadataBase: new URL(siteConfig.url),
    description,
    icons: { icon: "/favicon.ico" },
    openGraph: {
      title: `${name} — ${tagline}`,
      description,
      url: siteConfig.url,
      siteName: name,
      images: [
        {
          url: `${siteConfig.url}/deanukanah.jpg`,
          width: 620,
          height: 620,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    alternates: {
      canonical: "/",
      languages: { "en-US": "/en-US" },
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${tagline}`,
      description,
      images: { url: `${siteConfig.url}/deanukanah.jpg` },
    },
  };
}

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
