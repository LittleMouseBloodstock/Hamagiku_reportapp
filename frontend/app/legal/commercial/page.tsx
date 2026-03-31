'use client';

import Link from "next/link";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";

const content = {
  en: {
    back: 'Back to home',
    title: 'Commercial Disclosure',
    rows: [
      ['Seller', 'Little Mouse Bloodstock'],
      ['Service name', 'Shinba Report'],
      ['Business description', 'Monthly owner reporting SaaS for racehorse farms, trainers, and consignors. The service helps users organize horse updates, generate owner-facing reports, and export reports as PDFs.'],
      ['Representative', 'Kitana Junya'],
      ['Business address', 'Hirokoji Building 8F-B, 1-17-6 Ueno, Taito-ku, Tokyo 110-0005, Japan'],
      ['Phone number', 'Available upon request without delay pursuant to the Act on Specified Commercial Transactions.'],
      ['Customer support email', 'contact@shinba.app'],
      ['Support response method', 'Customer inquiries are accepted by email. We respond in the order received during normal business operations.'],
      ['Price', 'Plan-based monthly pricing. Current public pricing guidance is Basic JPY 5,980 per month, Pro JPY 14,800 per month, and Premium JPY 34,800 per month. Final trial and billing conditions are presented at checkout.'],
      ['Additional fees', 'Internet connection fees and other communication costs are borne by the customer.'],
      ['Payment timing and method', 'Payment is charged through Stripe at the time of subscription start and renews automatically every month until cancellation.'],
      ['Service delivery timing', 'The service becomes available immediately after account registration and successful payment or trial activation.'],
      ['Cancellation and refunds', 'Subscriptions can be cancelled from the customer billing portal. Charges already incurred are generally non-refundable except where required by law.'],
      ['Operating requirements', 'An internet connection and a modern desktop or mobile browser are required to use the service.'],
      ['Recommended environment', 'Latest versions of modern web browsers on desktop and mobile devices with internet access.'],
    ],
  },
  ja: {
    back: 'トップへ戻る',
    title: '特定商取引法に基づく表記',
    rows: [
      ['販売事業者', 'Little Mouse Bloodstock'],
      ['サービス名', 'Shinba Report'],
      ['サービス内容', '競走馬牧場、調教師、コンサイナー向けの月次オーナーレポート SaaS です。馬の近況整理、オーナー向けレポート生成、PDF 出力を行えます。'],
      ['運営責任者', 'Kitana Junya'],
      ['所在地', '〒110-0005 東京都台東区上野1丁目17番6号広小路ビル8F-B'],
      ['電話番号', '請求があった場合、特定商取引法に基づき遅滞なく開示いたします。'],
      ['サポート連絡先', 'contact@shinba.app'],
      ['お問い合わせ対応', 'お問い合わせはメールで受け付けています。通常業務の範囲で順次回答いたします。'],
      ['販売価格', 'プラン別の月額料金です。現時点の公開想定価格は Basic 月額5,980円、Pro 月額14,800円、Premium 月額34,800円です。無料トライアルの有無や最終的な請求条件は申込画面で案内します。'],
      ['追加費用', 'インターネット接続費用、通信費等はお客様のご負担となります。'],
      ['支払時期・方法', 'Stripe により申込時に決済され、解約まで毎月自動更新されます。'],
      ['提供時期', 'アカウント登録および決済完了、またはトライアル開始後すぐに利用できます。'],
      ['解約・返金', 'サブスクリプションはカスタマーポータルから解約できます。すでに発生した料金は、法令上必要な場合を除き原則返金いたしません。'],
      ['動作環境', 'インターネット接続環境および、最新のデスクトップまたはモバイルブラウザが必要です。'],
      ['推奨環境', 'インターネット接続可能なPCまたはモバイル端末上の最新ブラウザ。'],
    ],
  },
} as const;

export default function CommercialDisclosurePage() {
  const { language } = useLanguage();
  const copy = content[language];

  return (
    <main className="min-h-screen bg-[#fcfaf5] text-stone-900">
      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <Link href="/" className="text-sm font-medium text-[#1a3c34] hover:underline">
          {copy.back}
        </Link>
        <h1 className="mt-6 font-display text-5xl">{copy.title}</h1>
        <div className="mt-8 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_20px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="divide-y divide-stone-200 text-sm leading-8 text-stone-700">
            {copy.rows.map(([label, value]) => (
              <div key={label} className="grid gap-2 px-8 py-6 md:grid-cols-[220px_1fr]">
                <div className="font-semibold text-stone-900">{label}</div>
                <div>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <PublicSiteFooter />
    </main>
  );
}
