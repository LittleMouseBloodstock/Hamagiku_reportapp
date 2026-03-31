'use client';

import Link from "next/link";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";

const content = {
  en: {
    back: 'Back to home',
    title: 'Privacy Policy',
    sections: [
      ['Information we collect', 'We collect account information, subscription and billing details, and service usage data required to operate Shinba Report.'],
      ['How we use information', 'Information is used to provide the service, manage subscriptions, respond to support requests, improve the product, and maintain security.'],
      ['Anonymized service improvement data', 'If you consent within the service, we may use data entered into the service in a fully anonymized form for service improvement and statistical analysis. Anonymized data will not include names, direct contact details, or horse names that can identify a specific individual or business. You can review or change this setting later from Settings.'],
      ['Payments', 'Payments are processed by Stripe. We do not store full card numbers on our own servers.'],
      ['Data sharing', 'We do not sell personal information. We may share data with service providers only as needed to operate Shinba Report and process payments.'],
      ['Contact', 'Privacy questions can be sent to contact@shinba.app.'],
    ],
  },
  ja: {
    back: 'トップへ戻る',
    title: 'プライバシーポリシー',
    sections: [
      ['取得する情報', 'Shinba Report の提供に必要なアカウント情報、サブスクリプションおよび請求情報、サービス利用データを取得します。'],
      ['情報の利用目的', '取得した情報は、サービス提供、契約管理、サポート対応、プロダクト改善、およびセキュリティ維持のために利用します。'],
      ['匿名化された改善用データ', 'お客様がサービス内で同意した場合に限り、当社はサービス改善および統計分析のため、サービス内に入力されたデータを十分に匿名化した形で利用することがあります。匿名化データには、個人や法人を特定できる氏名、直接の連絡先、個別の馬名は含まれません。この設定は後から設定画面で変更できます。'],
      ['決済情報', '決済は Stripe により処理されます。当社サーバーに完全なカード番号を保存することはありません。'],
      ['第三者提供', '当社は個人情報を販売しません。Shinba Report の運営および決済処理に必要な範囲で、サービス提供事業者に情報を共有する場合があります。'],
      ['お問い合わせ', 'プライバシーに関するお問い合わせは contact@shinba.app までご連絡ください。'],
    ],
  },
} as const;

export default function PrivacyPage() {
  const { language } = useLanguage();
  const copy = content[language];

  return (
    <main className="min-h-screen bg-[#fcfaf5] text-stone-900">
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-medium text-[#1a3c34] hover:underline">
          {copy.back}
        </Link>
        <h1 className="mt-6 font-display text-5xl">{copy.title}</h1>
        <div className="mt-8 space-y-8 rounded-[28px] border border-black/10 bg-white p-8 leading-8 text-stone-700 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.35)]">
          {copy.sections.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
      </section>
      <PublicSiteFooter />
    </main>
  );
}
