import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Inter, Outfit } from "next/font/google";
import { cn } from "@/lib/utils";

const outfitHeading = Outfit({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
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
    "Portfolio",
    "Dean",
    "Onesi",
    "Ukanah",
    "Dean Onesi",
    "Ukanah Dean",
    "Onesi Ukanah",
    "Dean Onesi Ukanah",
    "Software Engineer",
    "Web Developer",
    "Mobile Developer",
    "Full-Stack Engineer",
    "Full Stack Engineer",
    "Full-Stack Developer",
    "Full Stack Developer",
    "Frontend Engineer",
    "Backend Engineer",
    "DevOps Engineer",
    "Cloud Engineer",
    "Cybersecurity Engineer",
    "AI Engineer",
    "Machine Learning Engineer",
    "Data Engineer",
    "Data Scientist",
    "Data Analyst",
    "Data Visualization Engineer",
    "Data Engineering",
    "Data Science",
    "Data Analysis",
    "Data Visualization",
    "Data Engineering",
    "Data Science",
    "Data Analysis",
    "Data Visualization",
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
    title: siteConfig.name,
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
    title: siteConfig.name,
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
    <html suppressHydrationWarning lang="en" className={cn("font-sans", inter.variable, outfitHeading.variable)}>
      <head />
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
