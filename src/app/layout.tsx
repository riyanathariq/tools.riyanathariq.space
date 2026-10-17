import type { Metadata } from "next";
import { Figtree, Fira_Code } from "next/font/google";

import { ToastProvider } from "@/components/toast";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.shortName}`,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author, url: siteConfig.authorUrl }],
  creator: siteConfig.author,
  keywords: [
    "developer tools",
    "online tools",
    "base64",
    "jwt",
    "json formatter",
    "regex tester",
    "uuid generator",
    "smtp tester",
    "webhook bin",
    "free web tools",
  ],
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: `${siteConfig.name} · ${siteConfig.shortName}`,
    description: siteConfig.description,
    siteName: siteConfig.shortName,
    locale: siteConfig.locale,
  },
  twitter: {
    card: "summary",
    title: `${siteConfig.name} · ${siteConfig.shortName}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

/** Applies the saved theme before first paint so there is no light/dark flash. */
const themeScript = `try{var t=localStorage.getItem("tl-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${firaCode.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
