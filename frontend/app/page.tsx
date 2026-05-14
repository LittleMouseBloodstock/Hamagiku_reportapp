import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Shinba Service | 馬の現場を支える業務サポート",
  description:
    "Shinba Service は、現役競走馬獣医師が現場経験をもとに、競走馬牧場・獣医・馬主報告の報告、記録、共有、引き継ぎを相談から支援します。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Shinba Service | 馬の現場を支える業務サポート",
    description:
      "現役競走馬獣医師が、馬の現場に合う報告・記録・共有の仕組みを整えます。Shinba Reportの導入相談もこちらから。",
    url: "https://shinba.app",
    siteName: "Shinba Service",
    type: "website",
    images: [{ url: "/shinba-service-logo-cropped.png", alt: "Shinba Service" }],
  },
  twitter: {
    card: "summary",
    title: "Shinba Service | 馬の現場を支える業務サポート",
    description:
      "現役競走馬獣医師が、馬の現場に合う報告・記録・共有の仕組みを整えます。",
    images: ["/shinba-service-logo-cropped.png"],
  },
};

export default function Home() {
  return <HomeClient />;
}
