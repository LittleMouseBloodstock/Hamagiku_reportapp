import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

const relatedLinks = [
  { href: "/use-cases/racehorse-monthly-report", label: "競走馬の月次レポート" },
  { href: "/features/horse-report-pdf", label: "PDF レポート作成" },
  { href: "/compare/translation-tool-vs-reporting-service", label: "翻訳ツールとの違い" },
];

export const metadata: Metadata = {
  title: "海外オーナー向け競走馬レポート | Shinba Report",
  description:
    "海外オーナーや馬主へ、競走馬の近況を英語または日英併記で共有するための報告作成サービス。写真、体重、コメント、所見を整理できます。",
  alternates: {
    canonical: "/use-cases/overseas-owner-reporting",
  },
};

export default function OverseasOwnerReportingPage() {
  return (
    <SeoLandingPage
      eyebrow="海外オーナー 報告"
      title="海外オーナーへ送る近況報告を、読みやすい英語に。"
      description="Shinba Report は、日本の牧場から海外オーナーへ送る月次報告を想定したサービスです。日本語で入力した現場メモを、英語または日英併記のレポートとして整え、相手に伝わる形で共有できます。"
      primaryCta="英語レポート作成を試す"
      sections={[
        {
          title: "英語報告の負担を減らす",
          body: "日本語で記録した内容を、海外オーナーが読みやすい英語の近況報告として整えます。",
        },
        {
          title: "翻訳だけで終わらない",
          body: "写真、体重、調教状況、状態コメントを含む、オーナー向けの月次レポートとして構成します。",
        },
        {
          title: "日英併記にも対応",
          body: "国内外の関係者が同じ内容を確認しやすいよう、日本語・英語・日英併記で出力できます。",
        },
      ]}
      faqs={[
        {
          q: "海外オーナー向けの英語報告に使えますか？",
          a: "使えます。日本語の現場メモから英語または日英併記の報告書を作成できます。",
        },
        {
          q: "馬の状態や調教コメントも含められますか？",
          a: "含められます。写真、体重、コメント、所見、ケア記録などを報告に整理できます。",
        },
      ]}
      relatedLinks={relatedLinks}
    />
  );
}
