import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

const relatedLinks = [
  { href: "/use-cases/overseas-owner-reporting", label: "海外オーナー報告" },
  { href: "/features/horse-report-pdf", label: "PDF レポート作成" },
  { href: "/features/premium-care-records", label: "Premium ケア記録" },
];

export const metadata: Metadata = {
  title: "競走馬の月次レポート作成 | Shinba Report",
  description:
    "競走馬牧場の写真、体重、コメント、所見をまとめ、馬主や海外オーナーへ送れる月次レポートを作成する Shinba Report の活用ページです。",
  alternates: {
    canonical: "/use-cases/racehorse-monthly-report",
  },
};

export default function RacehorseMonthlyReportPage() {
  return (
    <SeoLandingPage
      eyebrow="競走馬 レポート 作成"
      title="競走馬の月次レポートを、現場メモから整える。"
      description="Shinba Report は、牧場で記録した写真、体重、調教コメント、所見をまとめ、馬主へ送れる月次レポートに整える報告作成サービスです。毎月の報告をゼロから書き直す手間を減らし、同じ品質で続けやすくします。"
      primaryCta="月次レポート作成を試す"
      sections={[
        {
          title: "現場記録を一つに",
          body: "写真、体重、状態、調教コメントを馬ごとに集約し、報告書として読みやすい構成に整えます。",
        },
        {
          title: "月次運用に向く",
          body: "毎月くり返す報告業務を前提に、前月との比較や体重推移も見やすく扱えるようにしています。",
        },
        {
          title: "日英出力に対応",
          body: "日本語、英語、日英併記のレポートを作成でき、海外オーナー向け報告にも使えます。",
        },
      ]}
      faqs={[
        {
          q: "競走馬の月次レポート作成に使えますか？",
          a: "使えます。Shinba Report は競走馬牧場の月次レポート作成を想定し、写真、体重、コメント、所見を報告書として整理します。",
        },
        {
          q: "毎月同じ形式で報告できますか？",
          a: "できます。馬ごとの情報を同じ流れで入力し、送付しやすい月次レポートとして整えられます。",
        },
      ]}
      relatedLinks={relatedLinks}
    />
  );
}
