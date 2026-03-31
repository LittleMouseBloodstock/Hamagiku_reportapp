'use client';

import Link from "next/link";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";

const content = {
  en: {
    back: 'Back to home',
    title: 'Refund and Cancellation Policy',
    sections: [
      ['Free trial', 'When offered, Shinba Report may include a free trial before plan billing begins. You may cancel during the trial period to avoid paid subscription charges.'],
      ['Cancellation', 'You may cancel your subscription at any time through the customer billing portal. Cancellation takes effect at the end of the current billing period unless otherwise stated in Stripe.'],
      ['Refunds', 'Subscription payments are generally non-refundable once charged, except where required by law or where we choose to grant an exception.'],
      ['Support', 'Billing questions, cancellation support, and refund requests can be sent to contact@shinba.app.'],
    ],
  },
  ja: {
    back: 'トップへ戻る',
    title: '返金・解約ポリシー',
    sections: [
      ['無料トライアル', '提供時には Shinba Report に無料トライアルが含まれる場合があります。トライアル期間中に解約すれば、有料課金は発生しません。'],
      ['解約', 'サブスクリプションはカスタマーポータルからいつでも解約できます。Stripe 上で別途定めがない限り、解約は現在の請求期間の終了時に反映されます。'],
      ['返金', 'サブスクリプション料金は、法令上必要な場合または当社が例外的に認める場合を除き、原則として返金いたしません。'],
      ['サポート', '請求、解約、返金に関するお問い合わせは contact@shinba.app までご連絡ください。'],
    ],
  },
} as const;

export default function RefundPage() {
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
