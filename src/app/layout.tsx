import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import LayoutWithHeader from "./layout-with-header";

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
  icons: {
    icon: [
      { url: '/icon.png?v=2', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon.png?v=2',
  },
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
