import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";

const relatedLinks = [
  { href: "/features/horse-report-pdf", label: "PDF レポート作成" },
  { href: "/use-cases/racehorse-monthly-report", label: "競走馬の月次レポート" },
  { href: "/use-cases/overseas-owner-reporting", label: "海外オーナー報告" },
];

export const metadata: Metadata = {
  title: "獣医共有メモ・装蹄・駆虫記録 | Shinba Report Premium",
  description:
    "Shinba Report Premium では、牧場側が残す獣医共有メモ、装蹄、駆虫、退厩関連記録を管理し、必要に応じてレポート本文や appendix に反映できます。",
  alternates: {
    canonical: "/features/premium-care-records",
  },
};

export default function PremiumCareRecordsPage() {
  return (
    <SeoLandingPage
      eyebrow="Premium ケア記録"
      title="獣医共有メモや装蹄記録を、必要なときだけ報告に添付。"
      description="Shinba Report Premium では、牧場側が獣医から受けた説明、経過写真、装蹄、駆虫、退厩関連の記録を馬ごとに残せます。各記録は、本文に反映するか、2 ページ目の appendix に添付するか、含めないかを選べます。"
      primaryCta="Premium 機能を確認する"
      sections={[
        {
          title: "牧場側の共有メモ",
          body: "獣医が書く診療録ではなく、牧場側が受けた説明や経過を共有メモとして残す設計です。",
        },
        {
          title: "出力は選択式",
          body: "各記録ごとに、本文に軽く反映する、appendix に添付する、含めない、を選べます。",
        },
        {
          title: "画像にも対応",
          body: "傷、レントゲン、エコー、経過写真などを保存し、必要に応じて 2 ページ目に添付できます。",
        },
      ]}
      faqs={[
        {
          q: "獣医師が入力する機能ですか？",
          a: "いいえ。牧場側が獣医から受けた説明や画像を、共有メモとして残すための機能です。",
        },
        {
          q: "すべての記録が自動で本文に入りますか？",
          a: "入りません。本文に反映、appendix に添付、含めない、を記録ごとに選べます。",
        },
      ]}
      relatedLinks={relatedLinks}
    />
  );
}
