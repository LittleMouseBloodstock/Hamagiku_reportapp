import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

const relatedLinks = [
  { href: "/use-cases/racehorse-monthly-report", label: "競走馬の月次レポート" },
  { href: "/use-cases/overseas-owner-reporting", label: "海外オーナー報告" },
  { href: "/features/horse-report-pdf", label: "PDF レポート作成" },
];

export const metadata: Metadata = {
  title: "翻訳ツールではなく競走馬の報告業務サービス | Shinba Report",
  description:
    "Shinba Report は単なる翻訳ツールではなく、競走馬牧場の写真、体重、コメント、所見を整理し、馬主や海外オーナーへ送る報告書を作成するサービスです。",
  alternates: {
    canonical: "/compare/translation-tool-vs-reporting-service",
  },
};

export default function TranslationToolVsReportingServicePage() {
  return (
    <SeoLandingPage
      eyebrow="翻訳ツールとの違い"
      title="Shinba Report は、翻訳ではなく報告業務を整えるサービスです。"
      description="一般的な翻訳ツールは文章を別言語に変えるだけです。Shinba Report は、競走馬牧場の写真、体重、調教コメント、所見、ケア記録を整理し、馬主や海外オーナーへ送れる月次レポートとして整えることを目的にしています。"
      primaryCta="報告作成を試す"
      sections={[
        {
          title: "素材を整理する",
          body: "現場メモ、写真、体重、所見を、報告として読みやすい構成にまとめます。",
        },
        {
          title: "相手に合わせる",
          body: "国内馬主、海外オーナー、セリ後の買い手など、送り先に合わせた出力を想定しています。",
        },
        {
          title: "継続運用に向く",
          body: "毎月の報告を安定して回すため、保存、PDF、体重推移、ケア記録まで扱えます。",
        },
      ]}
      faqs={[
        {
          q: "翻訳ツールだけでは不十分ですか？",
          a: "単発の翻訳だけなら翻訳ツールでも足ります。ただし、写真、体重、コメント、所見を含む月次報告を継続する場合は、報告業務の流れごと整える方が安定します。",
        },
        {
          q: "英語だけでなく日本語レポートにも使えますか？",
          a: "使えます。日本語、英語、日英併記の形式で報告書を作成できます。",
        },
      ]}
      relatedLinks={relatedLinks}
    />
  );
}
