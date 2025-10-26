import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from './components/LocaleProvider'

export const metadata: Metadata = {
  title: "Skylon Build Network",
  description: "Commercial & Domestic refurbishment packages",
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