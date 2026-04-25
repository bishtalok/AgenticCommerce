import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boots ROI — Travel Mission",
  description:
    "Boots Ireland Travel Health & Essentials mission — an agentic shopping experience for your trip.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IE">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-boots-navy focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
