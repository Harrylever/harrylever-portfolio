import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  authors: [
    {
      name: "Dean Onesi Ukanah",
      url: "https://www.harrylever.dev",
    },
  ],
  creator: "Dean Onesi Ukanah",
  publisher: "Dean Onesi Ukanah @ Vercel",
  applicationName: "Harrylever Portfolio",
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
  metadataBase: new URL("https://www.harrylever.dev"),
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: "https://www.harrylever.dev",
    siteName: siteConfig.name,
    images: [
      { url: "https://www.harrylever.dev/hL.png", width: 620, height: 620 },
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
    images: { url: "https://www.harrylever.dev/hL.png" },
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
    <html suppressHydrationWarning lang="en">
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
