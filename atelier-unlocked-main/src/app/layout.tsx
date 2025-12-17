import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import LayoutWithHeader from "./layout-with-header";
import { Suspense } from "react";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "ATELIER - Luxury Validated by Desire",
  description: "Where exclusive pieces are unlocked by collective desire",
  keywords: ["luxury", "auction", "fashion", "design", "collectibles"],
  authors: [{ name: "ATELIER" }],
  openGraph: {
    title: "ATELIER - Luxury Validated by Desire",
    description: "Where exclusive pieces are unlocked by collective desire",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className={`${inter.variable} ${playfair.variable} font-sans overflow-x-hidden`} suppressHydrationWarning>
        <Providers>
          <LayoutWithHeader>{children}</LayoutWithHeader>
        </Providers>
      </body>
    </html>
  );
}

