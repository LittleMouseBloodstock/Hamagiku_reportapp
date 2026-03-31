'use client';

import Link from "next/link";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";

const content = {
  en: {
    back: 'Back to home',
    title: 'Terms of Service',
    sections: [
      ['Service', 'Shinba Report is an owner reporting SaaS designed for racehorse operations. The service supports multilingual monthly report creation, PDF export, client management, and AI-assisted comment generation for owners and clients.'],
      ['Accounts', 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.'],
      ['Subscription', 'Shinba Report is offered on plan-based monthly subscriptions. Public launch pricing is expected to begin at JPY 5,980 per month for Basic, JPY 14,800 per month for Pro, and JPY 34,800 per month for Premium. Trial availability and final billing conditions are shown at checkout. Continued use after any trial period authorizes recurring billing until cancellation.'],
      ['Acceptable use', 'You agree not to misuse the service, interfere with system operation, attempt unauthorized access, or use the service for unlawful activity.'],
      ['Contact', 'Questions about these terms can be sent to contact@shinba.app.'],
    ],
  },
  ja: {
    back: 'トップへ戻る',
    title: '利用規約',
    sections: [
      ['サービス内容', 'Shinba Report は競走馬運営向けのオーナーレポート SaaS です。多言語月次レポート作成、PDF 出力、クライアント管理、AI 補助によるコメント生成を提供します。'],
      ['アカウント', 'お客様は、ご自身のアカウント認証情報の機密保持、および当該アカウントで行われるすべての活動について責任を負います。'],
      ['サブスクリプション', 'Shinba Report はプラン別の月額サブスクリプションとして提供されます。公開時点の想定価格は Basic 月額5,980円、Pro 月額14,800円、Premium 月額34,800円です。無料トライアルの有無や最終的な請求条件は申込画面で案内します。トライアル終了後も利用を継続した場合、解約まで継続課金に同意したものとみなされます。'],
      ['禁止事項', 'お客様は、サービスの不正利用、システム運用の妨害、不正アクセスの試行、または違法行為への利用を行わないものとします。'],
      ['お問い合わせ', '本規約に関するお問い合わせは contact@shinba.app までご連絡ください。'],
    ],
  },
} as const;

export default function TermsPage() {
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
