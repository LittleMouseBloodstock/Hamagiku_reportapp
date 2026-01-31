import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans, Noto_Sans_JP, Shippori_Mincho, Newsreader } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const noto = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

const notoJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const shippori = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ['normal', 'italic'],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Monthly Report Generator",
  description: "Multilingual Report App",
  icons: {
    icon: '/icon.svg',
  },
};

import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import BfcacheReload from "@/components/BfcacheReload";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      </head>

      <body
        className={`${newsreader.variable} ${noto.variable} ${notoJP.variable} ${cormorant.variable} ${shippori.variable} antialiased bg-background-light dark:bg-background-dark text-stone-850 dark:text-gray-100 font-sans overflow-hidden`}
      >
        <AuthProvider>
          <LanguageProvider>
            <BfcacheReload />
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
