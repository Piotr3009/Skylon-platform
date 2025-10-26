import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from './components/LocaleProvider'

export const metadata: Metadata = {
  title: "Skylon Build Network - Construction Platform for Subcontractors",
  description: "Commercial & Domestic refurbishment packages for subcontractors in Central London. Access construction projects, submit proposals, and grow your business.",
  openGraph: {
    title: "Skylon Build Network",
    description: "Commercial & Domestic refurbishment packages for subcontractors in Central London",
    url: "https://skylonbuild.co.uk",
    siteName: "Skylon Build Network",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Skylon Build Network Logo",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skylon Build Network",
    description: "Commercial & Domestic refurbishment packages for subcontractors",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/skylon-logo.svg",
    shortcut: "/skylon-logo.svg",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}