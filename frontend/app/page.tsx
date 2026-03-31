'use client';

import { useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

const landingCopy = {
  ja: {
    eyebrow: '競走馬向けレポート作成ツール',
    headline: '競走馬の現場記録を、そのまま送れる報告に。',
    secondary:
      '入力するだけで、馬主・調教師に送れるレポートを自動作成。',
    body:
      'Shinba Report は、診療・調教・状態メモを、送り先に合わせた読みやすい報告へ整えるツールです。管理機能を増やすのではなく、報告を早く、正確に、送れる形にすることに特化しています。',
    kicker: '管理ツールではなく、報告に特化したツールです。',
    heroPrimaryCta: '無料トライアルを開始',
    heroSecondaryCta: 'デモを見る（30秒で流れを確認）',
    socialProofEyebrow: '現場での利用を前提に設計',
    socialProofItems: ['Trainer', 'Vet', 'Farm staff', 'Owner updates'],
    socialProofQuote: '「毎回の報告作成にかかる時間をまとめて削減」',
    positioningEyebrow: 'Shinba Report の立ち位置',
    positioningTitle: '管理ツールではなく、報告レイヤーです',
    positioningBody:
      'Shinba Report は、牧場全体を管理するための重いシステムではありません。現場で残した記録を、馬主・調教師・関係者向けの“送れる報告”に変えることに特化しています。',
    positioningPoints: [
      '管理機能を増やすより、報告を早くする',
      '記録をそのまま owner-ready な報告へ変える',
      '競走馬の現場で使う言葉と流れに合わせる',
    ],
    processTitle: '入力 → 整形 → 送信 が一つの流れで完結',
    processSteps: [
      { step: '① 入力', title: '診療・調教・状態メモを入力' },
      { step: '② 整形', title: '送付用レポートとして整理' },
      { step: '③ 送信', title: 'そのまま関係者へ共有' },
    ],
    featureEyebrow: '主な特長',
    featureTitle: '記録を、報告として使える形に変える',
    featureSub:
      '機能を並べるより、使ったときに何が楽になるかを重視しています。',
    cards: [
      {
        number: '01',
        title: 'メモが、そのまま報告になる',
        sub: 'Structured Reporting',
        body:
          '診療メモ、調教コメント、状態記録を入力するだけで、送付用のレポートとしてまとまります。',
      },
      {
        number: '02',
        title: '送り先に合わせて、そのまま出せる',
        sub: 'Multilingual Output',
        body:
          '日本語、英語、日英併記を切り替えられるため、海外オーナーや関係者にも同じ流れで共有できます。',
      },
      {
        number: '03',
        title: '競走馬の現場向けに作っている',
        sub: 'Built for Equine Practice',
        body:
          '調教、歩様、脚元、治療、オーナー向け近況報告など、競走馬の現場で実際に使う言葉と流れに合わせています。',
      },
    ],
    previewEyebrow: 'アプリ画面',
    previewTitle: '日本語でも英語でも、同じ流れで使えます',
    previewBody:
      '表示言語に合わせて入力欄・ラベル・プレビューの見え方を切り替えられます。送り先に合わせた出力を、その場で確認できます。',
    previewDashboardLabel: 'ダッシュボード',
    previewReportLabel: 'レポート作成',
    previewMetrics: [
      { label: '管理馬', value: '24' },
      { label: '今月のレポート', value: '18' },
      { label: '送付先', value: '11' },
    ],
    previewHorseName: 'テストホース',
    previewRecipient: 'オーナー向け / 月次レポート',
    previewCommentLabel: 'コメント',
    previewComment:
      '先週土曜日に軽度の疝痛がありましたが、歩かせたところバナミン投与後に痛みは見られませんでした。その後は順調です。',
    pricingEyebrow: '料金',
    pricingTitle: '役割で選べる月額プラン',
    pricingBody:
      'すべてのプランで報告作成と日英出力が可能です。違いは、下書きの完成度と、使うほど自分たち向けに育つかどうかです。',
    plans: [
      {
        name: 'Standard',
        price: '¥5,980 / 月',
        approx: 'USD目安: 約$40 / 月',
        note: 'まずは日々の報告を早くまとめたい方向け',
        features: ['基本レポート生成', '日英出力', 'レポート保存'],
      },
      {
        name: 'Pro',
        price: '¥14,800 / 月',
        approx: 'USD目安: 約$99 / 月',
        note: '最初から、送りやすい下書きを出したい方向け',
        features: ['送り先に合わせた文面調整', '競走馬向けの用語・表現に強い', '現場でそのまま使いやすい下書き', 'Standard より高い初稿品質'],
      },
      {
        name: 'Premium',
        price: '¥34,800 / 月',
        approx: 'USD目安: 約$233 / 月',
        note: '自分たちの直し方まで次回に活かしたい方向け',
        features: ['保存前の修正を次回の下書きに反映', '自分たちの言い回しに近づく', '送り先ごとの調整を蓄積', '使うほど自分たち向けに育つ'],
      },
    ],
    privacyEyebrow: 'データ管理',
    privacyTitle: '記録は外に漏れません',
    privacyBody:
      '各アカウントのデータは分離されており、他ユーザーに顧客情報やレポート内容が見えることはありません。安心して業務にご利用いただけます。',
    privacyPoints: [
      '各アカウント / ワークスペースのデータは分離されます',
      '顧客データや個別レポートは他ユーザーに公開されません',
      '改善に使うのは一般化されたパターンであり、個別記録そのものは共有されません',
      '業務記録ツールとして、プライバシーを重視して設計しています',
    ],
    faqEyebrow: 'よくある質問',
    faqTitle: '導入前によく聞かれること',
    faqs: [
      {
        q: '英語しか使わないチームでも使えますか？',
        a: '使えます。英語のみ、日本語のみ、日英併記を切り替えられるため、送り先に合わせて運用できます。',
      },
      {
        q: 'Pro と Premium の違いは何ですか？',
        a: 'Pro は最初から送りやすい下書きを出しやすくするプランです。Premium は、その上に保存前の直し方を次回の下書きへ反映していくプランです。',
      },
      {
        q: 'データは他の牧場と共有されますか？',
        a: '共有されません。各アカウントの記録は分離され、他ユーザーに個別データが見えることはありません。',
      },
    ],
    finalEyebrow: '始めやすく、続けやすく',
    finalTitle: '毎月の報告作業を、現場で回る形に整えます。',
    finalBody:
      'まずは無料トライアルで、日々の記録がどれだけ早く“送れる報告”になるかを体験してください。',
    finalPrimaryCta: '無料トライアルを開始',
    finalSecondaryCta: 'お問い合わせ',
    contactLine: '導入相談やデモ依頼は contact@shinba.app までご連絡ください。',
  },
  en: {
    eyebrow: 'Equine reporting software',
    headline: 'Turn daily horse records into ready-to-send reports.',
    secondary:
      'Write your notes once. Get a clean, ready-to-send report instantly.',
    body:
      'Shinba Report turns day-to-day horse records into owner-ready updates. It is not an all-in-one management platform. It is the reporting layer that helps equine teams write once and send with confidence.',
    kicker: 'Built for reporting, not for managing everything.',
    heroPrimaryCta: 'Start Free Trial',
    heroSecondaryCta: 'View Demo (30-sec overview)',
    socialProofEyebrow: 'Built for real equine operations',
    socialProofItems: ['Breeding farms', 'Equine veterinarians', 'Training facilities', 'Owner reporting'],
    socialProofQuote: '"Cuts report preparation time dramatically."',
    positioningEyebrow: 'Positioning',
    positioningTitle: 'Not another management platform.',
    positioningBody:
      'Shinba Report is built for reporting. Instead of asking teams to replace every stable system, it turns day-to-day notes into owner-ready reports that can be sent immediately.',
    positioningPoints: [
      'Focused on reporting, not on managing everything',
      'Turns daily notes into owner-ready updates',
      'Built for equine workflows, not generic admin software',
    ],
    processTitle: 'Write once. Format automatically. Send immediately.',
    processSteps: [
      { step: '01', title: 'Enter notes' },
      { step: '02', title: 'Auto-format report' },
      { step: '03', title: 'Share immediately' },
    ],
    featureEyebrow: 'Key features',
    featureTitle: 'Built around the reporting workflow',
    featureSub:
      'The product is designed around what happens after you write the note: formatting, review, and sending.',
    cards: [
      {
        number: '01',
        title: 'Write notes, get a report',
        sub: 'Structured Reporting',
        body:
          'Turn daily records into clean, consistent reports without rebuilding the layout every time.',
      },
      {
        number: '02',
        title: 'Switch languages for the recipient',
        sub: 'Multilingual Output',
        body:
          'Choose Japanese-only, English-only, or bilingual output depending on who needs the update.',
      },
      {
        number: '03',
        title: 'Built for equine reporting',
        sub: 'Built for Equine Practice',
        body:
          'Made for veterinary notes, training updates, horse status reporting, and owner communication.',
      },
    ],
    previewEyebrow: 'Product preview',
    previewTitle: 'English pages should look English',
    previewBody:
      'When the site is in English, the product preview also switches to English. That keeps the experience consistent and makes it clear that the workflow is already usable for international teams.',
    previewDashboardLabel: 'Dashboard',
    previewReportLabel: 'Report Builder',
    previewMetrics: [
      { label: 'Active horses', value: '24' },
      { label: 'Reports this month', value: '18' },
      { label: 'Recipients', value: '11' },
    ],
    previewHorseName: 'Test Horse',
    previewRecipient: 'Owner / Monthly Report',
    previewCommentLabel: 'English Comment',
    previewComment:
      'Good recovery after the weekend colic episode. Pain settled after walking and flunixin paste, and the horse has remained comfortable since.',
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Monthly plans built around reporting needs',
    pricingBody:
      'Every plan includes report generation and multilingual output. The difference is how polished the first draft is, and whether the system learns from your approved edits.',
    plans: [
      {
        name: 'Standard',
        price: '¥5,980 / month',
        approx: 'Approx. $40 / month',
        note: 'For teams that need a simple reporting workflow',
        features: ['Core report generation', 'Japanese / English output', 'Report saving'],
      },
      {
        name: 'Pro',
        price: '¥14,800 / month',
        approx: 'Approx. $99 / month',
        note: 'For teams that want stronger owner-ready drafts from day one',
        features: ['Audience-aware writing', 'Equine terminology support', 'Cleaner drafts with less manual rewriting', 'Higher-quality first drafts than Standard'],
      },
      {
        name: 'Premium',
        price: '¥34,800 / month',
        approx: 'Approx. $233 / month',
        note: 'For teams that want the system to adapt to their own writing style',
        features: ['Learns from approved edits', 'Personal style adaptation', 'Recipient-specific refinement over time', 'Improves as your team keeps using it'],
      },
    ],
    privacyEyebrow: 'Privacy & Security',
    privacyTitle: 'Your records stay private.',
    privacyBody:
      'Shinba Report is built as a professional recordkeeping tool. Each account and workspace operates in an isolated environment, and no client or horse data is exposed to other users.',
    privacyPoints: [
      'Each account and workspace is isolated',
      'No client data is shared across users',
      'System improvements may use generalized patterns, but your records are never exposed to others',
      'Privacy comes first for veterinary, training, and owner-facing reporting',
    ],
    faqEyebrow: 'Frequently asked questions',
    faqTitle: 'What teams usually ask before rollout',
    faqs: [
      {
        q: 'Can we use the product in English only?',
        a: 'Yes. You can switch between Japanese-only, English-only, and bilingual output depending on your reporting workflow.',
      },
      {
        q: 'What is the difference between Pro and Premium?',
        a: 'Pro gives you stronger first drafts from the start. Premium adds learning from your approved edits so future drafts move closer to how your team actually writes.',
      },
      {
        q: 'Is our data visible to other farms or clinics?',
        a: 'No. Account data stays isolated. Other users do not see your client records, horse records, or saved reports.',
      },
    ],
    finalEyebrow: 'Start with a practical workflow',
    finalTitle: 'Reduce report rewrite time without sacrificing trust.',
    finalBody:
      'Start the free trial and see how quickly daily notes turn into owner-ready reports.',
    finalPrimaryCta: 'Start Free Trial',
    finalSecondaryCta: 'Contact Sales',
    contactLine: 'Questions about rollout, pricing, or workflows? Contact contact@shinba.app.',
  },
} as const;

function ProductPreview({
  language,
  copy,
}: {
  language: 'ja' | 'en';
  copy: (typeof landingCopy)['ja'] | (typeof landingCopy)['en'];
}) {
  if (language === 'en') {
    return (
      <div className="grid gap-4 xl:pt-6" id="demo">
        <div className="rounded-[26px] border border-[#e2d8c7] bg-white p-4 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.28)]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#c5a059]">{copy.previewEyebrow}</p>
          <h2 className="mt-3 font-display text-[2rem] leading-tight text-[#18392f]">{copy.previewTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">{copy.previewBody}</p>
          <div className="mt-5 grid gap-4">
            <div className="overflow-hidden rounded-[20px] border border-[#ebe1cf]">
              <div className="border-b border-[#ebe1cf] bg-[#fbf7ef] px-4 py-2 text-xs font-semibold text-stone-600">
                {copy.previewDashboardLabel}
              </div>
              <Image
                src="/lp-dashboard-shot-en.png"
                alt="English dashboard screenshot"
                width={1280}
                height={847}
                className="h-auto w-full bg-white"
                priority
              />
            </div>
            <div className="overflow-hidden rounded-[20px] border border-[#ebe1cf]">
              <div className="border-b border-[#ebe1cf] bg-[#fbf7ef] px-4 py-2 text-xs font-semibold text-stone-600">
                {copy.previewReportLabel}
              </div>
              <Image
                src="/lp-report-shot-en.png"
                alt="English report builder screenshot"
                width={1270}
                height={846}
                className="h-auto w-full bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:pt-6" id="demo">
      <div className="rounded-[26px] border border-[#e2d8c7] bg-white p-4 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.28)]">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#c5a059]">{copy.previewEyebrow}</p>
        <h2 className="mt-3 font-display text-[2rem] leading-tight text-[#18392f]">{copy.previewTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">{copy.previewBody}</p>
        <div className="mt-5 grid gap-4">
          <div className="overflow-hidden rounded-[22px] border border-[#ebe1cf] bg-[#f8f3ea]">
            <div className="flex items-center justify-between border-b border-[#ebe1cf] bg-white px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#c5a059]">{copy.previewDashboardLabel}</p>
                <p className="mt-1 text-sm font-semibold text-stone-700">牧場全体の状況</p>
              </div>
              <div className="rounded-full bg-[#183b2d]/8 px-3 py-1 text-xs font-semibold text-[#183b2d]">
                運用中ワークスペース
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              {copy.previewMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-[#e9decf] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{metric.label}</p>
                  <p className="mt-2 font-display text-[2rem] text-[#18392f]">{metric.value}</p>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-[#e9decf] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{copy.previewHorseName}</p>
                    <p className="text-xs text-stone-500">{copy.previewRecipient}</p>
                  </div>
                  <div className="rounded-full bg-[#c5a059]/14 px-3 py-1 text-xs font-semibold text-[#8a6724]">
                    下書き作成済み
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
                  <div className="overflow-hidden rounded-xl border border-[#eadfce]">
                    <Image
                      src="/lp-report-shot.png"
                      alt="馬の写真プレビュー"
                      width={1243}
                      height={768}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-xl bg-[#fbf7ef] p-4">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#c5a059]">{copy.previewCommentLabel}</p>
                    <p className="mt-3 text-sm leading-7 text-stone-700">{copy.previewComment}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#ebe1cf] bg-[#183b2d] p-5 text-white">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#e8d49a]">
                  信頼される理由
                </p>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  プレビューの表示言語、レポートの構造、送り先に合わせた見え方がそろっているため、オーナー・調教師・獣医の誰に向けても流れが崩れません。
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/6 p-4">
                <p className="text-xs font-semibold text-white">出力モード</p>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  <li>英語のみ</li>
                  <li>日本語のみ</li>
                  <li>日英併記</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { language } = useLanguage();
  const copy = landingCopy[language];

  useEffect(() => {
    const previousHtmlOverflowY = document.documentElement.style.overflowY;
    const previousHtmlOverflowX = document.documentElement.style.overflowX;
    const previousBodyOverflowY = document.body.style.overflowY;
    const previousBodyOverflowX = document.body.style.overflowX;

    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';

    return () => {
      document.documentElement.style.overflowY = previousHtmlOverflowY;
      document.documentElement.style.overflowX = previousHtmlOverflowX;
      document.body.style.overflowY = previousBodyOverflowY;
      document.body.style.overflowX = previousBodyOverflowX;
    };
  }, []);

  const landingTheme = {
    '--brand-primary': '#183b2d',
    '--brand-primary-dark': '#10281f',
    '--brand-accent': '#c7a45a',
  } as CSSProperties;

  return (
    <main style={landingTheme} className="min-h-screen bg-[#f6f0e7] text-stone-900">
      <section className="relative border-b border-[#e7dcc6] bg-[linear-gradient(180deg,#f8f2e8_0%,#f3ecdf_100%)]">
        <div className="mx-auto flex w-full max-w-[1360px] items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Image src="/brand-mark.png" alt="Shinba Report" width={42} height={42} className="rounded-xl shadow-sm" />
            <div className="font-display text-[1.8rem] leading-none text-[var(--brand-primary-dark)]">Shinba Report</div>
          </div>
          <LanguageToggle />
        </div>

        <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-4 pb-10 pt-5 md:px-8 xl:grid-cols-[minmax(0,680px)_minmax(460px,580px)] xl:items-start">
          <div className="max-w-[760px]">
            <div className="mb-4 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-[#c5a059]">
              <span className="h-px w-10 bg-[#c5a059]" />
              {copy.eyebrow}
            </div>
            <h1 className="max-w-[720px] font-display text-[2.8rem] leading-[1.04] text-[#18392f] sm:text-[3.7rem] lg:text-[4.5rem]">
              {copy.headline}
            </h1>
            <p className="mt-4 max-w-[700px] font-serif text-[1.4rem] leading-tight text-[#2d5a3d] sm:text-[1.8rem]">
              {copy.secondary}
            </p>
            <p className="mt-5 max-w-[690px] text-[15px] leading-8 text-stone-700">{copy.body}</p>
            <p className="mt-4 text-sm font-semibold tracking-[0.06em] text-[#7b5b1c]">{copy.kicker}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] transition hover:bg-[var(--brand-primary-dark)]"
                style={{ color: '#ffffff' }}
              >
                {copy.heroPrimaryCta}
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--brand-primary)_24%,white)] bg-white px-6 py-3 text-sm font-semibold !text-[var(--brand-primary)] shadow-[0_12px_30px_-20px_rgba(0,0,0,0.28)] transition hover:border-[color-mix(in_srgb,var(--brand-primary)_42%,white)] hover:bg-[#fffdf8]"
                style={{ color: 'var(--brand-primary)' }}
              >
                {copy.heroSecondaryCta}
              </a>
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-600">{copy.contactLine}</p>
          </div>

          <ProductPreview language={language} copy={copy} />
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#fbf7ef]">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-8 text-center md:px-8">
          <p className="text-xs tracking-[0.2em] text-[#a08a63]">{copy.socialProofEyebrow}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-stone-600">
            {copy.socialProofItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-stone-500">{copy.socialProofQuote}</p>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f8f3ea]">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-14 md:px-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#c5a059]">{copy.positioningEyebrow}</p>
              <h2 className="mt-3 font-display text-[3rem] leading-none text-[var(--brand-primary)]">{copy.positioningTitle}</h2>
              <p className="mt-4 max-w-[760px] text-sm leading-8 text-stone-700">{copy.positioningBody}</p>
            </div>
            <div className="grid gap-3">
              {copy.positioningPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-[#e7ddcf] bg-white px-4 py-4 text-sm leading-7 text-stone-700 shadow-[0_20px_40px_-36px_rgba(0,0,0,0.2)]">
                  <div className="mb-2 h-1.5 w-10 rounded-full bg-[var(--brand-accent)]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f9f5ec]">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-14 md:px-8">
          <div className="text-center">
            <h2 className="font-display text-[2.4rem] text-[var(--brand-primary)]">{copy.processTitle}</h2>
          </div>
          <div className="mt-8 grid gap-4 text-center md:grid-cols-3">
            {copy.processSteps.map((step) => (
              <div key={step.step} className="rounded-xl border border-[#e5d8bf] bg-white p-5">
                <p className="text-sm text-stone-500">{step.step}</p>
                <p className="mt-2 font-semibold text-stone-800">{step.title}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#c5a059]">{copy.featureEyebrow}</p>
            <h2 className="mt-3 font-display text-[3rem] leading-none text-[var(--brand-primary)]">{copy.featureTitle}</h2>
            <p className="mx-auto mt-3 max-w-[780px] text-sm leading-7 text-stone-600">{copy.featureSub}</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {copy.cards.map((card) => (
              <article key={card.number} className="relative overflow-hidden rounded-2xl border border-[#e5d8bf] bg-[#fbf6ec] p-6">
                <p className="text-[10px] tracking-[0.24em] text-[#c5a059]">{card.number}</p>
                <h3 className="mt-3 font-display text-[2rem] text-[var(--brand-primary)]">{card.title}</h3>
                <p className="mt-1 text-sm font-semibold text-[#2d5a3d]">{card.sub}</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f3ece1]">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-14 md:px-8">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#c5a059]">{copy.pricingEyebrow}</p>
            <h2 className="mt-3 font-display text-[3rem] leading-none text-[var(--brand-primary)]">{copy.pricingTitle}</h2>
            <p className="mx-auto mt-4 max-w-[880px] text-sm leading-7 text-stone-600">{copy.pricingBody}</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {copy.plans.map((plan, index) => (
              <article
                key={plan.name}
                className={`rounded-[24px] border p-6 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.22)] ${
                  index === 1 ? 'border-[#c7a45a] bg-[#fffaf1]' : 'border-[#e5d8bf] bg-[#fbf7ef]'
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#c5a059]">{plan.name}</p>
                <p className="mt-3 font-display text-[2.3rem] leading-none text-[var(--brand-primary)]">{plan.price}</p>
                <p className="mt-2 text-sm font-semibold text-[#7b5b1c]">{plan.approx}</p>
                <p className="mt-3 text-sm leading-7 text-stone-600">{plan.note}</p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-stone-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f8f3ea]">
        <div className="mx-auto grid w-full max-w-[1360px] gap-8 px-4 py-14 md:px-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#c5a059]">{copy.privacyEyebrow}</p>
            <h2 className="mt-3 font-display text-[3rem] leading-none text-[var(--brand-primary)]">{copy.privacyTitle}</h2>
            <p className="mt-4 max-w-[820px] text-sm leading-8 text-stone-700">{copy.privacyBody}</p>
          </div>
          <div className="grid gap-3">
            {copy.privacyPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-[#e7ddcf] bg-white px-4 py-4 text-sm leading-7 text-stone-700 shadow-[0_20px_40px_-36px_rgba(0,0,0,0.2)]">
                <div className="mb-2 h-1.5 w-10 rounded-full bg-[var(--brand-accent)]" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f9f5ec]">
        <div className="mx-auto w-full max-w-[1360px] px-4 py-14 md:px-8">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#c5a059]">{copy.faqEyebrow}</p>
            <h2 className="mt-3 font-display text-[3rem] leading-none text-[var(--brand-primary)]">{copy.faqTitle}</h2>
          </div>
          <div className="mt-10 grid gap-4">
            {copy.faqs.map((faq) => (
              <article key={faq.q} className="rounded-2xl border border-[#e5d8bf] bg-[#fbf6ec] p-6">
                <h3 className="font-display text-[1.8rem] text-[var(--brand-primary)]">{faq.q}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-700">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--brand-primary)]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[20rem] text-white/[0.03]">信</div>
        <div className="mx-auto w-full max-w-[1360px] px-4 py-16 text-center md:px-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#e8d49a]">{copy.finalEyebrow}</p>
          <h2 className="mt-3 font-display text-[3rem] leading-none text-white sm:text-[3.8rem]">{copy.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-[760px] text-lg leading-8 text-white/72">{copy.finalBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold text-[#102018] shadow-[0_18px_40px_-22px_rgba(0,0,0,0.45)] transition hover:brightness-105"
            >
              {copy.finalPrimaryCta}
            </Link>
            <a
              href="mailto:contact@shinba.app"
              className="inline-flex items-center justify-center rounded-md border border-white/55 bg-white/8 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] transition hover:border-white/80 hover:bg-white/14"
            >
              {copy.finalSecondaryCta}
            </a>
          </div>
          <p className="mt-5 text-sm text-white/45">¥5,980 / ¥14,800 / ¥34,800 · Little Mouse Bloodstock</p>
          <p className="mt-1 text-xs text-white/35">Approx. $40 / $99 / $233 per month · billed in JPY</p>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
