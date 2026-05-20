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
  metadataBase: new URL("https://shinba.app"),
  title: "Shinba Service | 競走馬の現場情報を、信頼できる報告・共有・判断へ",
  description: "Shinba Service は、競走馬牧場・獣医・馬主報告など馬の現場に合わせて、報告、記録、多言語Handoff、現場ごとの業務設計を支援します。",
  applicationName: "Shinba Service",
  keywords: [
    "Shinba Service",
    "Shinba Report",
    "馬 レポート サービス",
    "競走馬 レポート 作成",
    "牧場 月次レポート",
    "海外オーナー 報告",
    "競走馬 近況報告",
    "馬 英語 レポート",
    "牧場 報告書 作成",
    "競走馬",
    "競走馬牧場",
    "牧場レポート",
    "月次レポート",
    "オーナーレポート",
    "馬主レポート",
    "racehorse farm reports",
    "owner reporting",
    "multilingual horse reports",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "ja-JP": "/",
      "en-US": "/",
    },
  },
  icons: {
    icon: [
      { url: '/favicon.png?v=20260514a', type: 'image/png', sizes: '64x64' },
      { url: '/apple-touch-icon.png?v=20260514a', type: 'image/png', sizes: '180x180' },
    ],
    shortcut: '/favicon.png?v=20260514a',
    apple: '/apple-touch-icon.png?v=20260514a',
  },
  openGraph: {
    title: "Shinba Service | 競走馬の現場情報を、信頼できる報告・共有・判断へ",
    description: "競走馬牧場・獣医・馬主報告の現場に合わせて、報告、記録、多言語Handoff、現場ごとの業務設計を支援します。",
    url: "https://shinba.app",
    siteName: "Shinba Service",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    type: "website",
    images: [
      {
        url: "/shinba-service-logo-cropped.png",
        alt: "Shinba Service",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Shinba Service | 競走馬の現場情報を、信頼できる報告・共有・判断へ",
    description: "競走馬の現場に散らばる情報を、信頼できる報告・共有・判断へ整えます。",
    images: ["/shinba-service-logo-cropped.png"],
  },
};

import { LanguageProvider } from "@/contexts/LanguageContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import DemoInit from "@/components/DemoInit";
import PublicAnalytics from "@/components/PublicAnalytics";
import { Suspense } from "react";

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
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=20260514a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260514a" />
        <link rel="shortcut icon" type="image/png" href="/favicon.png?v=20260514a" />
      </head>

      <body
        className={`${newsreader.variable} ${noto.variable} ${notoJP.variable} ${cormorant.variable} ${shippori.variable} antialiased bg-background-light dark:bg-background-dark text-stone-850 dark:text-gray-100 font-sans overflow-x-hidden`}
      >
        <PublicAnalytics />
        <Suspense>
          <DemoInit />
        </Suspense>
        <AuthProvider>
          <LanguageProvider>
            <WorkspaceProvider>
              <BrandingProvider>
                {children}
              </BrandingProvider>
            </WorkspaceProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
