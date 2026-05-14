import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shinba Report | 競走馬の月次レポート作成サービス",
  description:
    "Shinba Report は、競走馬牧場の月次レポート作成、海外オーナー向け近況報告、写真・体重・コメント・所見の整理を支援する報告業務専用サービスです。",
  alternates: {
    canonical: "/report",
  },
  openGraph: {
    title: "Shinba Report | 競走馬の月次レポート作成サービス",
    description:
      "写真・体重・コメント・所見をまとめ、競走馬の月次レポートや海外オーナー向け近況報告を作成しやすくする報告業務専用サービスです。",
    url: "https://shinba.app/report",
    siteName: "Shinba",
    type: "website",
    images: [{ url: "/brand-mark.png", alt: "Shinba Report" }],
  },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
