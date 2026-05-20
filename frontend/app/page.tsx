import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Shinba Service | 競走馬の現場情報を、信頼できる報告・共有・判断へ",
  description:
    "Shinba Service は、現役競走馬獣医師の現場経験を起点に、競走馬の報告、記録、多言語Handoff、現場ごとの業務設計を支援するプロダクト群です。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Shinba Service | 競走馬の現場情報を、信頼できる報告・共有・判断へ",
    description:
      "現役競走馬獣医師の現場経験を起点に、競走馬の報告、記録、多言語Handoff、現場ごとの業務設計を支援します。",
    url: "https://shinba.app",
    siteName: "Shinba Service",
    type: "website",
    images: [{ url: "/shinba-service-logo-cropped.png", alt: "Shinba Service" }],
  },
  twitter: {
    card: "summary",
    title: "Shinba Service | 競走馬の現場情報を、信頼できる報告・共有・判断へ",
    description:
      "競走馬の現場に散らばる情報を、信頼できる報告・共有・判断へ整えます。",
    images: ["/shinba-service-logo-cropped.png"],
  },
};

export default function Home() {
  return <HomeClient />;
}
