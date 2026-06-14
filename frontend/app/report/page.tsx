'use client';

import { useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublicSiteFooter from '@/components/PublicSiteFooter';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

const landingCopy = {
  ja: {
    eyebrow: '競走馬牧場の月次レポート・海外オーナー報告向け',
    headline: '馬主向け報告を、現場メモから読みやすい月次レポートへ。',
    secondary:
      '写真、体重、コメント、所見をまとめ、送付前に確認できる形へ整えます。',
    body:
      'Shinba Report は、競走馬牧場向けに設計された報告作成サービスです。日本語・英語・日英併記の報告書を、入力から確認、PDF出力までひとつの流れで整えます。',
    kicker: 'まずは1件分の報告サンプルから、現場の運用に合うかを確認できます。',
    heroPrimaryCta: '導入について相談する',
    backToHub: 'Shinba Serviceへ戻る',
    socialProofEyebrow: 'こんな報告業務を想定しています',
    socialProofItems: ['オーナー（海外含む）への月次報告', '英語が必要な近況共有', 'セリ後の買い手向けフォローアップ', '育成状況の定期レポート'],
    socialProofQuote: '報告文作成、英語対応、写真・体重・コメント整理を、月次業務として続けやすい形に整えます。',
    positioningEyebrow: 'Shinba Report とは',
    positioningTitle: '競走馬現場の報告業務を、ひとつの流れに。',
    positioningBody:
      '牧場の現場は忙しく、写真、体重、調教コメント、所見、ケア記録が別々に残りがちです。Shinba Report は、それらを馬ごとの月次レポートとして整理し、送り先に合わせて日本語・英語・日英併記で出力できるようにする、競走馬向けの報告業務サービスです。',
    positioningPoints: [
      '写真・体重・コメント・所見を、馬ごとの報告書にまとめられる',
      '海外オーナー向けの英語レポートや日英併記レポートを作成できる',
      '競走馬の現場で使う言葉と報告の流れに合わせて整えられる',
    ],
    seoIntentEyebrow: '検索される課題に、そのまま応える',
    seoIntentTitle: '「馬のレポート作成」を、牧場の実務に合わせて支援します。',
    seoIntentBody:
      'Shinba Report は、競走馬の近況報告、牧場の月次レポート、海外オーナーへの英語報告を想定して作られています。単発の翻訳ではなく、毎月くり返す報告業務を安定して回すためのサービスです。',
    seoIntentItems: [
      '牧場の報告書作成を、馬ごとの記録から進められる',
      '競走馬の写真・体重・調教コメント・所見を一つのレポートに整理できる',
      '海外オーナーや馬主向けに、日本語・英語・日英併記で近況を共有できる',
    ],
    processTitle: '入力して、確認して、送るだけ。',
    processSteps: [
      { step: '01', title: '現場メモを入力' },
      { step: '02', title: '送付用レポートとして整える' },
      { step: '03', title: '日本語または英語で共有' },
    ],
    featureEyebrow: '主な特長',
    featureTitle: '毎月の報告作業を軽くする、3つの理由',
    featureSub:
      '機能を増やすことより、毎月の報告をどれだけ早く、安定して回せるかを重視しています。',
    cards: [
      {
        number: '01',
        title: 'メモを入れると、報告としてまとまる',
        sub: 'Structured Reporting',
        body:
          '写真、体重、調教コメント、状態記録、所見を入力すると、送付しやすい構成の競走馬レポートに整えられます。毎回ゼロから文面を組み立て直す必要がありません。',
      },
      {
        number: '02',
        title: '英語が必要な相手にも、そのまま出せる',
        sub: 'Multilingual Output',
        body:
          '日本語で入力したメモを、海外オーナー向けの英語報告や日英併記レポートとして出力できます。香港・UAE・オーストラリアの馬主、セリ後の海外バイヤー、外国産馬のオーナーへの近況共有にも対応しやすくなります。',
      },
      {
        number: '03',
        title: '競走馬の牧場現場の言葉で動く',
        sub: 'Built for Equine Practice',
        body:
          '調教、歩様、脚元、治療、近況報告など、競走馬の牧場で実際に使う言葉と流れに合わせて構築されています。一般的な翻訳ツールや管理ツールとは異なり、報告業務そのものに合わせて作られています。',
      },
    ],
    previewEyebrow: 'アプリ画面',
    previewTitle: '入力から報告確認まで、同じ画面で完結',
    previewBody:
      'ダッシュボードで馬ごとの状況を確認し、レポート作成画面でそのまま報告を整えられます。送り先に応じて日本語・英語を切り替えながら、送付前の確認まで一つの流れで進められます。',
    previewDashboardLabel: 'ダッシュボード',
    previewReportLabel: 'レポート作成',
    previewDashboardImage: '/lp-dashboard-shot.png',
    previewReportImage: '/lp-report-shot.png',
    previewTrustTitle: '英語報告が必要になる場面にも対応',
    previewTrustBody:
      '近年、日本の育成牧場が英語で報告書を送る必要がある場面は確実に増えています。Shinba Report は、そのすべてに日本語入力・英語出力で対応します。',
    previewTrustList: [ '香港・UAE・豪州の馬主への月次報告',
      '国内セリ（JRHA・HBAなど）での落札後フォローアップ',
      '外国産馬オーナーへの育成状況報告',
      '海外投資シンジケートへの定期近況報告',],
    previewMetrics: [
      { label: '管理馬', value: '24' },
      { label: '今月のレポート', value: '18' },
      { label: '送付先', value: '11' },
    ],
    previewHorseName: 'サクラノホシ',
    previewRecipient: 'オーナー向け / 月次レポート',
    previewCommentLabel: '今月のコメント',
    previewComment:
      '先週末に軽度の疝痛がありましたが、処置後は落ち着き、翌日には通常メニューへ戻っています。現在は問題なく、引き続き順調に進めています。',
    pricingEyebrow: '料金',
    pricingTitle: '報告品質に合わせて選べる月額プラン',
    pricingBody:
      'Standard は競走馬の月次レポート作成、Pro は体重・調教師情報まで含めた報告運用、Premium はケア記録や退厩時レポートまで扱う上位プランです。',
    plans: [
      {
        name: 'Standard',
        price: '¥5,980 / 月',
        approx: 'USD目安: 約$40 / 月',
        note: 'まずは試してみたい方向け',
        features: ['月次レポート生成', '日本語・英語・日英併記出力', 'レポート保存 / PDF出力'],
      },
      {
        name: 'Pro',
        price: '¥14,800 / 月',
        approx: 'USD目安: 約$99 / 月',
        note: '月次報告の運用をチームで効率化したい牧場向け',
        features: ['Standard の全機能', '体重一括入力', '調教師管理とレポート反映', '競走馬向けの用語・表現に強い下書き'],
      },
      {
        name: 'Premium',
        price: '¥34,800 / 月',
        approx: 'USD目安: 約$233 / 月',
        note: 'ケア記録や退厩時レポートまで一体で管理したい牧場向け',
        features: ['Pro の全機能', '獣医共有メモ・装蹄・駆虫記録', '画像付きケア記録の2ページ目添付', '退厩時レポート作成', '過去の修正を次回の出力に反映'],
      },
    ],
    privacyEyebrow: 'データ管理',
    privacyTitle: '顧客情報は外に出ません',
    privacyBody:
      '馬主情報、馬の記録、レポート内容は各アカウント内で分離されており、他の牧場や他ユーザーに見えることはありません。業務用ツールとして、プライバシーを前提に設計しています。',
    privacyPoints: [
      '各アカウントのデータは完全に分離されます',
      '馬主情報や個別レポートは他ユーザーに公開されません',
      'システム改善には一般化されたパターンのみを使用します',
      '業務記録ツールとしてプライバシーを最優先に設計しています',
    ],
    faqEyebrow: 'よくある質問',
    faqTitle: '導入前によく聞かれること',
    faqs: [
      {
        q: '馬の月次レポート作成サービスとして使えますか？',
        a: '使えます。Shinba Report は、競走馬牧場の月次レポート作成を想定した報告業務サービスです。写真、体重、コメント、所見を整理し、馬主や海外オーナーへ送れる形に整えます。',
      },
      {
        q: '海外オーナー向けの英語報告にも対応していますか？',
        a: '対応しています。日本語で記録した内容を、英語または日英併記の報告書として整えられます。単なる直訳ではなく、馬主が読みやすい近況報告として伝わることを重視しています。',
      },
      {
        q: '英語が得意でないスタッフでも使えますか？',
        a: '使えます。現場では日本語で入力し、送り先に応じて英語や日英併記で出力できます。英語が必要な報告でも、英語を書く必要は一切ありません。普段の入力の流れを大きく変えずに運用できます。',
      },
      {
        q: '今使っている管理システムと併用できますか？',
        a: 'できます。Shinba Report は管理機能を置き換えるためのツールではなく、報告書作成に特化したツールです。現場の記録をここに入力して、レポートを作成・送付するだけでご利用いただけます。',
      },
      {
        q: 'Pro と Standard の違いは何ですか？',
        a: 'Standard は月次レポート作成と日英出力に対応します。Pro は体重一括入力、調教師管理、調教師情報のレポート反映まで使えるため、毎月の報告運用をチームで回しやすくなります。ケア記録や退厩時レポートまで必要な場合は Premium が対象です。',
      },
    ],
    finalEyebrow: '今月のレポートから変える',
    finalTitle: '競走馬の近況報告を、今月から整える。',
    finalBody:
      '既存のメモ、写真、体重、コメントをもとに、まずは1件分の報告サンプルから確認できます。',
    finalPrimaryCta: '導入について相談する',
    finalSecondaryCta: 'お問い合わせ',
    contactLine: '導入相談や海外オーナー向け報告のご相談は contact@shinba.app までご連絡ください。',
  },
  en: {
    eyebrow: 'For owners with horses in Japan',
    headline: 'Turn farm notes into owner-ready monthly reports.',
    secondary:
      'Photos, weight, comments, and observations are organized into reports owners can read and trust.',
    body:
      'Shinba Report helps Japanese farms deliver clear English reports to owners, buyers, and partners abroad. Instead of awkward translations or fragmented updates, recipients receive structured monthly reports that reflect the horse’s actual care, training, and condition in language that reads naturally.',
    kicker: 'Start with one real or anonymized sample report before changing the workflow.',
    heroPrimaryCta: 'Request Consultation',
    backToHub: 'Back to Shinba Service',
    socialProofEyebrow: 'Built for international owner communication',
    socialProofItems: ['Owners in Hong Kong and the UAE', 'International bloodstock partners', 'Post-sale buyer follow-up', 'Monthly reporting for horses in Japan'],
    socialProofQuote: 'Designed for recurring owner reports, English communication, and post-sale follow-up from Japanese farms.',
    positioningEyebrow: 'What it solves',
    positioningTitle: 'Your horse may be in Japan. The communication should still be clear.',
    positioningBody:
      'International owners often receive updates that are delayed, inconsistent, or difficult to read. Shinba Report gives Japanese farms a better reporting workflow, so owners abroad receive clear monthly reports they can understand immediately and refer back to over time.',
    positioningPoints: [
      'Clear English reports for owners with horses in Japan',
      'A consistent monthly format that is easy to review over time',
      'Reporting built around equine workflows, not generic translation tools',
    ],
    seoIntentEyebrow: 'Built for reporting from Japanese farms',
    seoIntentTitle: 'Monthly horse reports, prepared around the farm workflow.',
    seoIntentBody:
      'Shinba Report helps farms organize photos, weight, comments, care notes, and horse condition into reports owners can read and rely on.',
    seoIntentItems: [
      'Create owner-ready reports from horse records',
      'Organize photos, weight, comments, and observations in one flow',
      'Share updates in Japanese, English, or bilingual format',
    ],
    processTitle: 'Farm notes in. Clear owner updates out.',
    processSteps: [
      { step: '01', title: 'Farm staff record the horse' },
      { step: '02', title: 'The report is structured for the owner' },
      { step: '03', title: 'You receive it in clear English' },
    ],
    featureEyebrow: 'Key features',
    featureTitle: 'Built for owners who need clarity, not guesswork',
    featureSub:
      'The product is designed around the real owner-side problem: understanding what is happening with the horse without decoding awkward wording or inconsistent updates.',
    cards: [
      {
        number: '01',
        title: 'Reports that read like proper English',
        sub: 'Structured Reporting',
        body:
          'Monthly updates are written in clear, natural English so owners can understand the horse’s condition, progress, and care without second-guessing the meaning.',
      },
      {
        number: '02',
        title: 'A format you can trust month after month',
        sub: 'Multilingual Output',
        body:
          'Updates arrive in a consistent reporting structure, making it easier to review progress, compare months, and stay aligned with the farm’s direction.',
      },
      {
        number: '03',
        title: 'Built for horses in Japanese care',
        sub: 'Built for Equine Practice',
        body:
          'Training notes, condition updates, veterinary observations, treatment details, and routine owner communication are handled in a reporting style suited to thoroughbred operations in Japan.',
      },
    ],
    previewEyebrow: 'Product preview',
    previewTitle: 'What an owner-ready report looks like',
    previewBody:
      'The farm records the horse in its normal workflow, and the final output is prepared as a clear English report for the owner. That means fewer unclear updates and less time spent interpreting what the farm meant to say.',
    previewDashboardLabel: 'Dashboard',
    previewReportLabel: 'Report Builder',
    previewDashboardImage: '/lp-report-shot-en.png',
    previewReportImage: '/lp-dashboard-shot-en.png',
    previewTrustTitle: 'Why owners care about this',
    previewTrustBody:
      'Owners with horses in Japan want updates that feel professional, readable, and dependable. The goal is not just translation. The goal is communication you can trust.',
    previewTrustList: ['English reports that are easy to read', 'A monthly format owners can follow consistently', 'Clear communication from the farm to the recipient'],
    previewMetrics: [
      { label: 'Active horses', value: '24' },
      { label: 'Reports this month', value: '18' },
      { label: 'Recipients', value: '11' },
    ],
    previewHorseName: 'Test Horse',
    previewRecipient: 'Owner / Monthly Report',
    previewCommentLabel: "Owner update",
    previewComment:
      'The horse recovered well after a mild colic episode over the weekend. Signs settled promptly after walking and flunixin, and he returned to normal work the following day with no ongoing concern.',
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Plans built around reporting quality',
    pricingBody:
      'Standard covers monthly report creation. Pro adds operational tools such as bulk weight entry and trainer management. Premium adds care records, departure reports, and appendix-style supporting material.',
    plans: [
      {
        name: 'Standard',
        price: '¥5,980 / month',
        approx: 'Approx. $40 / month',
        note: 'For teams starting with structured owner reporting',
        features: ['Monthly report generation', 'Japanese / English / bilingual output', 'Report saving and PDF export'],
      },
      {
        name: 'Pro',
        price: '¥14,800 / month',
        approx: 'Approx. $99 / month',
        note: 'For farms that want a smoother monthly reporting workflow',
        features: ['Everything in Standard', 'Bulk weight entry', 'Trainer management and report reflection', 'Stronger equine terminology in drafts'],
      },
      {
        name: 'Premium',
        price: '¥34,800 / month',
        approx: 'Approx. $233 / month',
        note: 'For teams managing care records and departure reporting in one workflow',
        features: ['Everything in Pro', 'Farm-side vet notes, farrier, and worming records', 'Image-supported care appendix', 'Departure report creation', 'Learns from approved edits over time'],
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
    faqTitle: 'What owners and farms usually ask',
    faqs: [
      {
        q: 'Can farms use this for monthly horse reports?',
        a: 'Yes. Shinba Report is designed for recurring owner reporting from racehorse farms, including photos, weight, condition notes, and monthly updates.',
      },
      {
        q: 'Is this meant for owners, or for the farm?',
        a: 'The system is used by the farm, but the output is designed so owners abroad receive clearer, more reliable English updates.',
      },
      {
        q: 'How is this different from using a translation tool?',
        a: 'Translation tools convert sentences. Shinba Report is built around equine reporting itself, so the result feels like a proper owner update rather than a literal translation of farm notes.',
      },
      {
        q: 'Will the reports still reflect what the farm actually means?',
        a: 'That is the point of the workflow. The system is designed to turn farm-side notes into clear owner-facing English without losing the meaning of the original update.',
      },
    ],
    finalEyebrow: 'Start with the next monthly report',
    finalTitle: 'Receive updates that are clear enough to trust.',
    finalBody:
      'Start with one existing note set, photo set, or monthly update and see what the report workflow should look like.',
    finalPrimaryCta: 'Request Consultation',
    finalSecondaryCta: 'Contact Sales',
    contactLine: 'Questions about reporting for owners abroad or communication from Japanese farms? Contact contact@shinba.app.',
  },
} as const;

function ProductPreview({
  copy,
}: {
  copy: (typeof landingCopy)['ja'] | (typeof landingCopy)['en'];
}) {
  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-4 lg:mx-0 lg:ml-auto" id="demo">
      <div className="rounded-lg border border-[#e2d8c7] bg-white p-4 shadow-[0_30px_80px_-52px_rgba(0,0,0,0.32)] sm:p-5 xl:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.previewEyebrow}</p>
        <h2 className="mt-3 max-w-[520px] text-balance font-display text-[1.35rem] leading-snug text-[#18392f] sm:text-[1.55rem]">
          {copy.previewTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">{copy.previewBody}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-md border border-[#ebe1cf] xl:self-start">
            <div className="border-b border-[#ebe1cf] bg-[#fbf7ef] px-4 py-2 text-xs font-semibold text-stone-600">
              {copy.previewDashboardLabel}
            </div>
            <Image
              src={copy.previewDashboardImage}
              alt={`${copy.previewDashboardLabel} screenshot`}
              width={1280}
              height={847}
              className="aspect-[1280/847] h-auto w-full bg-white object-cover object-top"
              priority
            />
          </div>

          <div className="overflow-hidden rounded-md border border-[#ebe1cf]">
            <div className="border-b border-[#ebe1cf] bg-[#fbf7ef] px-4 py-2 text-xs font-semibold text-stone-600">
              {copy.previewReportLabel}
            </div>
            <Image
              src={copy.previewReportImage}
              alt={`${copy.previewReportLabel} screenshot`}
              width={1270}
              height={846}
              className="aspect-[1270/846] h-auto w-full bg-white object-cover object-top"
            />
          </div>

          <div className="rounded-lg border border-[#ebe1cf] bg-[#183b2d] p-5 text-white md:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e8d49a]">{copy.previewTrustTitle}</p>
            <p className="mt-3 text-sm leading-7 text-white/78">{copy.previewTrustBody}</p>
            <div className="mt-4 rounded-md border border-white/12 bg-white/6 p-4 md:p-5">
              <ul className="grid gap-2 text-sm text-white/75 md:grid-cols-2">
                {copy.previewTrustList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
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

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Shinba Report',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://shinba.app',
    description:
      language === 'ja'
        ? '競走馬牧場の月次レポート作成、海外オーナー向け近況報告、写真・体重・コメント・所見の整理を支援する報告業務専用サービスです。'
        : 'A reporting workflow service for Japanese racehorse farms preparing owner-ready monthly reports in Japanese, English, or bilingual format.',
    offers: [
      { '@type': 'Offer', name: 'Standard', price: '5980', priceCurrency: 'JPY' },
      { '@type': 'Offer', name: 'Pro', price: '14800', priceCurrency: 'JPY' },
      { '@type': 'Offer', name: 'Premium', price: '34800', priceCurrency: 'JPY' },
    ],
    audience: {
      '@type': 'Audience',
      audienceType: language === 'ja' ? '競走馬牧場、育成牧場、海外オーナー向け報告担当者' : 'Racehorse farms and owner reporting teams',
    },
  };

  return (
    <main style={landingTheme} className="min-h-screen overflow-x-hidden bg-[#fffaf1] text-stone-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative border-b border-[#e7dcc6] bg-[linear-gradient(180deg,#fffaf1_0%,#f6efdf_100%)]">
        <div className="absolute inset-0 -z-0 opacity-[0.16] [background-image:linear-gradient(rgba(24,60,50,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(24,60,50,0.18)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/brand-mark.png" alt="Shinba Report" width={42} height={42} className="rounded-xl shadow-sm" />
            <div className="font-display text-[1.65rem] leading-none text-[var(--brand-primary-dark)] sm:text-[1.8rem]">Shinba Report</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex rounded-md border border-[#d8c9ae] bg-white/70 px-3 py-2 text-xs font-semibold text-[#18392f] transition hover:border-[#c7a45a] hover:bg-white sm:px-4"
            >
              {copy.backToHub}
            </Link>
            <LanguageToggle />
          </div>
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-10 px-5 pb-14 pt-8 sm:px-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)] lg:items-center lg:gap-12 xl:pb-16 xl:pt-10">
          <div className="max-w-[720px]">
            <div className="mb-4 inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#9b6426]">
              <span className="h-px w-10 bg-[#c5a059]" />
              {copy.eyebrow}
            </div>
            <h1 className="max-w-[720px] text-balance font-display text-[2.2rem] leading-[1.16] text-[#18392f] sm:text-[2.6rem] lg:text-[2.75rem] xl:text-[3rem]">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-[680px] text-[1.1rem] font-semibold leading-8 text-[#2d5a3d] sm:text-[1.28rem]">
              {copy.secondary}
            </p>
            <p className="mt-5 max-w-[690px] text-[15px] leading-8 text-stone-700">{copy.body}</p>
            <p className="mt-4 text-sm font-semibold tracking-[0.06em] text-[#7b5b1c]">{copy.kicker}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="mailto:contact@shinba.app?subject=Shinba%20Report%20%E5%B0%8E%E5%85%A5%E7%9B%B8%E8%AB%87"
                className="inline-flex items-center justify-center rounded-md bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] transition hover:bg-[var(--brand-primary-dark)]"
                style={{ color: '#ffffff' }}
              >
                {copy.heroPrimaryCta}
              </Link>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-600">{copy.contactLine}</p>
          </div>

          <ProductPreview copy={copy} />
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#fbf7ef]">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-8 text-center md:px-8">
          <p className="text-xs tracking-[0.2em] text-[#a08a63]">{copy.socialProofEyebrow}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-stone-600">
            {copy.socialProofItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-stone-500">{copy.socialProofQuote}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#fffaf1]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.seoIntentEyebrow}</p>
            <h2 className="mt-3 font-display text-[2.15rem] leading-tight text-[var(--brand-primary)] sm:text-[2.5rem]">{copy.seoIntentTitle}</h2>
            <p className="mt-4 text-sm leading-8 text-stone-700">{copy.seoIntentBody}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
            {copy.seoIntentItems.map((item) => (
              <div key={item} className="rounded-lg border border-[#eadbc1] bg-white px-4 py-4 text-sm leading-7 text-stone-700 shadow-[0_20px_42px_-38px_rgba(0,0,0,0.24)]">
                <div className="mb-2 h-1.5 w-10 rounded-full bg-[var(--brand-accent)]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f8f3ea]">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-14 md:px-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.positioningEyebrow}</p>
              <h2 className="mt-3 font-display text-[2.2rem] leading-tight text-[var(--brand-primary)] sm:text-[2.65rem]">{copy.positioningTitle}</h2>
              <p className="mt-4 max-w-[760px] text-sm leading-8 text-stone-700">{copy.positioningBody}</p>
            </div>
            <div className="grid gap-3">
              {copy.positioningPoints.map((point) => (
                <div key={point} className="rounded-lg border border-[#e7ddcf] bg-white px-4 py-4 text-sm leading-7 text-stone-700 shadow-[0_20px_40px_-36px_rgba(0,0,0,0.2)]">
                  <div className="mb-2 h-1.5 w-10 rounded-full bg-[var(--brand-accent)]" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f9f5ec]">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-14 md:px-8">
          <div className="text-center">
            <h2 className="font-display text-[2.2rem] leading-tight text-[var(--brand-primary)] sm:text-[2.65rem]">{copy.processTitle}</h2>
          </div>
          <div className="mt-8 grid gap-4 text-center md:grid-cols-3">
            {copy.processSteps.map((step) => (
              <div key={step.step} className="rounded-lg border border-[#e5d8bf] bg-white p-5">
                <p className="text-sm text-stone-500">{step.step}</p>
                <p className="mt-2 font-semibold text-stone-800">{step.title}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center sm:mt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.featureEyebrow}</p>
            <h2 className="mt-3 font-display text-[2.25rem] leading-tight text-[var(--brand-primary)] sm:text-[2.7rem]">{copy.featureTitle}</h2>
            <p className="mx-auto mt-3 max-w-[780px] text-sm leading-7 text-stone-600">{copy.featureSub}</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {copy.cards.map((card) => (
              <article key={card.number} className="relative overflow-hidden rounded-lg border border-[#e5d8bf] bg-[#fbf6ec] p-6">
                <p className="text-[10px] font-bold tracking-[0.24em] text-[#9b6426]">{card.number}</p>
                <h3 className="mt-3 font-display text-[1.75rem] leading-tight text-[var(--brand-primary)]">{card.title}</h3>
                <p className="mt-1 text-sm font-semibold text-[#2d5a3d]">{card.sub}</p>
                <p className="mt-3 text-sm leading-7 text-stone-700">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f3ece1]">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-14 md:px-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.pricingEyebrow}</p>
            <h2 className="mt-3 font-display text-[2.25rem] leading-tight text-[var(--brand-primary)] sm:text-[2.7rem]">{copy.pricingTitle}</h2>
            <p className="mx-auto mt-4 max-w-[880px] text-sm leading-7 text-stone-600">{copy.pricingBody}</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {copy.plans.map((plan, index) => (
              <article
                key={plan.name}
                className={`rounded-lg border p-6 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.22)] ${
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
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-14 md:px-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.privacyEyebrow}</p>
            <h2 className="mt-3 font-display text-[2.25rem] leading-tight text-[var(--brand-primary)] sm:text-[2.7rem]">{copy.privacyTitle}</h2>
            <p className="mt-4 max-w-[820px] text-sm leading-8 text-stone-700">{copy.privacyBody}</p>
          </div>
          <div className="grid gap-3">
            {copy.privacyPoints.map((point) => (
              <div key={point} className="rounded-lg border border-[#e7ddcf] bg-white px-4 py-4 text-sm leading-7 text-stone-700 shadow-[0_20px_40px_-36px_rgba(0,0,0,0.2)]">
                <div className="mb-2 h-1.5 w-10 rounded-full bg-[var(--brand-accent)]" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#ece2cf] bg-[#f9f5ec]">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-14 md:px-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#9b6426]">{copy.faqEyebrow}</p>
            <h2 className="mt-3 font-display text-[2.25rem] leading-tight text-[var(--brand-primary)] sm:text-[2.7rem]">{copy.faqTitle}</h2>
          </div>
          <div className="mt-10 grid gap-4">
            {copy.faqs.map((faq) => (
              <article key={faq.q} className="rounded-lg border border-[#e5d8bf] bg-[#fbf6ec] p-6">
                <h3 className="font-display text-[1.55rem] leading-tight text-[var(--brand-primary)]">{faq.q}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-700">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--brand-primary)]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[20rem] text-white/[0.03]">信</div>
        <div className="mx-auto w-full max-w-[1180px] px-5 py-16 text-center md:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#e8d49a]">{copy.finalEyebrow}</p>
          <h2 className="mt-3 font-display text-[2.35rem] leading-tight text-white sm:text-[3rem]">{copy.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-[760px] text-lg leading-8 text-white/72">{copy.finalBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="mailto:contact@shinba.app?subject=Shinba%20Report%20%E5%B0%8E%E5%85%A5%E7%9B%B8%E8%AB%87"
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
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
