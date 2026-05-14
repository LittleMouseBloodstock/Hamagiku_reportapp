import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

const relatedLinks = [
  { href: "/use-cases/racehorse-monthly-report", label: "競走馬の月次レポート" },
  { href: "/use-cases/overseas-owner-reporting", label: "海外オーナー報告" },
  { href: "/features/premium-care-records", label: "Premium ケア記録" },
];

export const metadata: Metadata = {
  title: "馬の報告書 PDF 作成 | Shinba Report",
  description:
    "競走馬の写真、体重、コメント、所見をまとめた報告書を PDF 出力できる Shinba Report の機能紹介ページです。",
  alternates: {
    canonical: "/features/horse-report-pdf",
  },
};

export default function HorseReportPdfPage() {
  return (
    <SeoLandingPage
      eyebrow="馬 報告書 PDF 作成"
      title="馬主へ送れる競走馬レポートを、PDF まで一つの流れで。"
      description="Shinba Report では、馬ごとの写真、体重、コメント、所見を整理し、送付しやすい報告書として PDF 出力できます。日本語、英語、日英併記に対応し、月次報告の確認から保存まで一つの流れで進められます。"
      primaryCta="PDF レポート作成を試す"
      sections={[
        {
          title: "送付用に整う",
          body: "馬の写真、体重推移、コメントをレポートとして見やすく配置し、馬主へ送れる形に整えます。",
        },
        {
          title: "日英で出力",
          body: "送り先に応じて、日本語、英語、日英併記の PDF レポートを作成できます。",
        },
        {
          title: "ケア記録も拡張可能",
          body: "Premium では、選択したケア記録や画像を 2 ページ目の appendix として添付できます。",
        },
      ]}
      faqs={[
        {
          q: "PDF で保存できますか？",
          a: "できます。作成したレポートはブラウザの印刷機能から PDF として保存できます。",
        },
        {
          q: "日英併記の PDF も作れますか？",
          a: "作れます。日本語、英語、日英併記の形式を選んでレポートを整えられます。",
        },
      ]}
      relatedLinks={relatedLinks}
    />
  );
}
