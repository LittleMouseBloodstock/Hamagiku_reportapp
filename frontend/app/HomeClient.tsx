"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  MessagesSquare,
  Mic,
  PenTool,
  Route,
  Stethoscope,
} from "lucide-react";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

const consultationSteps = [
  "今の報告文、LINE、Excel、写真管理の流れを確認します",
  "すぐ整えられる作業と、現場で判断すべき作業を切り分けます",
  "1件分のサンプルや画面デモで、導入後の使い方を確認します",
  "合いそうであれば、必要なサービスやテンプレートを設定します",
];

const situations = [
  "海外オーナー向けの英語報告に時間がかかる",
  "スタッフごとに報告文の品質や表現がばらつく",
  "馬ごとの写真・体重・コメントが散らばっている",
  "既製品の管理システムでは現場の流れに合わない",
  "まずは相談しながら、小さく試してみたい",
];

const values = [
  {
    icon: Stethoscope,
    title: "現場の言葉に合わせる",
    body: "競走馬、牧場、獣医、馬主報告の言葉と流れを前提に、無理なく使える形へ整えます。",
  },
  {
    icon: MessageCircle,
    title: "話を聞いてから始める",
    body: "いきなり契約ではなく、現在の報告や記録の流れを見て、合う形を確認してから進めます。",
  },
  {
    icon: Route,
    title: "必要なところから整える",
    body: "大きなシステム導入ではなく、今月の報告や日々の記録など、効果が見えやすい範囲から始めます。",
  },
];

export default function Home() {
  const { language } = useLanguage();
  const en = language === "en";
  const copy = {
    consult: en ? "Contact" : "相談する",
    eyebrow: en ? "Equine Service Studio" : "Equine Service Studio",
    headline: en ? "Connect trust. Move the future." : "信頼をつなぎ、未来を動かす。",
    lead: en
      ? "Shinba Service is led by an active racehorse veterinarian and shaped by firsthand experience with reporting, records, communication, and handover work in equine operations."
      : "Shinba Service は、現役競走馬獣医師が現場で見てきた報告、記録、共有、引き継ぎの課題をもとに、馬の現場に合う仕組みを整える活動です。",
    lead2: en
      ? "Shinba Report is one service within that work, focused on monthly updates and owner reporting."
      : "Shinba Report はその中のひとつで、月次報告や海外オーナー向けレポートを支えます。",
    primary: en ? "Request consultation" : "個別相談をする",
    secondary: en ? "View Report service" : "Reportサービスを見る",
    note: en
      ? "Start by showing the current reporting or recordkeeping flow. We identify where a practical improvement would actually help."
      : "まずは現在の報告文や記録方法を見ながら、どこから整えると良いかを一緒に確認します。",
    profileLabel: en ? "Veterinarian-led work" : "現役競走馬獣医師の現場経験から",
    profileCard: en ? "From field conversations to usable workflows." : "現場の会話から、使える形へ。",
    profileEyebrow: en ? "Activity profile" : "Activity profile",
    profileTitle: en
      ? "Shinba Service is a professional activity led by an active racehorse veterinarian, turning field experience into practical workflows."
      : "Shinba Serviceは、現役競走馬獣医師が現場経験を活かして、仕組みにしづらい作業を整えていく活動です。",
    profileBody: en
      ? "Report writing, English updates, voice notes, handovers, photos, and weight records all vary by farm and team. Off-the-shelf systems often do not fit cleanly. Shinba Service starts by listening to the current operation, then shapes only the necessary parts into something usable."
      : "報告文の作成、英語での近況共有、音声メモ、引き継ぎ、写真や体重の整理。こうした業務は、現場ごとのやり方が強く、既製品を入れるだけではうまく収まりにくいことがあります。だから最初に今の運用を聞き、必要な部分だけを使いやすい形に整えます。",
    servicesTitle: en
      ? "Reporting, records, and communication. Start where the field gets stuck."
      : "報告、記録、共有。現場で詰まりやすい作業から始めます。",
    servicesBody: en
      ? "Shinba Report is the first concrete service for monthly reporting. The wider Shinba Service activity also covers multilingual handoff communication, voice records, invoices, inventory, and other field-specific workflows."
      : "Shinba Report は、私の活動の中で最初に形にしているサービスです。活動全体では、報告に限らず、多言語での申し送り、音声記録、請求、在庫など、現場ごとの困りごとに合わせて必要な仕組みを扱います。",
    reportTitle: en ? "Prepare monthly and international owner reports faster." : "月次報告や海外オーナー向けレポートを、短時間で整えます。",
    reportBody: en
      ? "Shinba Report handles the monthly reporting part of Shinba Service. It organizes photos, weight, comments, and observations into reports that can be shared with owners and overseas partners."
      : "Shinba Report は、私の活動の中で月次報告を担当するサービスです。写真・体重・コメント・所見をまとめ、馬主や海外オーナーへ送れるレポートに整えます。",
    reportCta: en ? "View Shinba Report" : "Shinba Reportを見る",
    discussOne: en ? "Discuss one report" : "1件分で相談する",
    consultationTitle: en ? "First, check whether it fits the current work." : "まずは、今の業務に合うかを一緒に確認します。",
    consultationBody: en
      ? "The first step is not a subscription. We review the current records and reports, then identify where improvement would make a real difference. Only if it fits do we move into Shinba Report or tailored templates."
      : "いきなり月額契約を前提にするのではなく、今の記録方法や報告文を見ながら、どこを整えると効果が出るかを整理します。合いそうな場合だけ、Reportサービスや個別テンプレートの導入へ進みます。",
    nextTitle: en ? "Start by showing one current report." : "今の報告業務を、まず1件だけ見せてください。",
    nextBody: en
      ? "With existing notes, photos, reports, or messages, we identify where Shinba Service should begin. If it fits, we can move into a monthly plan or a setup-supported rollout."
      : "既存のメモ、写真、レポート、LINE文面を見ながら、Shinba Serviceでどこから整えるべきかを確認します。相談後に合いそうであれば、月額プランや個別設定込みの導入へ進めます。",
    details: en ? "Report service details" : "Reportサービス詳細へ",
  };
  const valuesToShow = en
    ? [
        { icon: Stethoscope, title: "Built around field language", body: "The work starts from the language and flow used by racehorse farms, veterinarians, and owner reporting teams." },
        { icon: MessageCircle, title: "Start with a conversation", body: "No forced subscription first. We review the current workflow and confirm what would fit before moving forward." },
        { icon: Route, title: "Improve the right part first", body: "Instead of a large system rollout, we begin with areas where the benefit is easy to see, such as this month’s report or daily records." },
      ]
    : values;
  const steps = en
    ? [
        ["Discuss", "Review the current workflow and pain points"],
        ["Prototype", "Test with one sample or a small screen"],
        ["Operate", "Continue through Shinba Report or a tailored tool"],
      ]
    : [
        ["相談", "現場の流れと困りごとを確認"],
        ["試作", "1件分のサンプルや小さな画面で検証"],
        ["運用", "Reportや個別ツールとして継続利用"],
      ];
  const situationsToShow = en
    ? ["English owner reports take too much time", "Report quality and wording vary by staff member", "Photos, weight, and comments are scattered across tools", "Generic systems do not match the field workflow", "You want to start small through consultation"]
    : situations;
  const consultationStepsToShow = en
    ? ["Review the current reporting, LINE, Excel, and photo workflow", "Separate what can be streamlined from what should remain field judgment", "Use one sample or demo screen to confirm the future workflow", "If it fits, set up the right service or templates"]
    : consultationSteps;
  const productsToShow = en
    ? [
        {
          name: "Shinba Report",
          label: "Main service",
          href: "/report",
          icon: FileText,
          title: "Monthly and international owner reports",
          body: "Organizes photos, weight, comments, and observations into Japanese, English, or bilingual reports that can be shared with owners.",
        },
        {
          name: "Shinba Handoff",
          label: "Preparing",
          href: "mailto:contact@shinba.app?subject=Shinba%20Handoff%20Consultation",
          icon: MessagesSquare,
          title: "Multilingual communication for farm teams",
          body: "A communication workflow in preparation so staff with different native languages can share instructions, cautions, and horse updates in their own language, with translation supporting smoother daily care. In the future, it aims to handle farm-specific words, names, and expressions through a dedicated knowledge layer.",
        },
        {
          name: "Voice & Vet Notes",
          label: "In discussion",
          href: "mailto:contact@shinba.app?subject=Shinba%20Consultation",
          icon: Mic,
          title: "Turn voice notes and veterinary notes into usable records",
          body: "Organizes care, treatment, training, and handover notes into records that can be reviewed later.",
        },
        {
          name: "Workflow Build",
          label: "Tailored work",
          href: "mailto:contact@shinba.app?subject=Shinba%20Workflow%20Consultation",
          icon: PenTool,
          title: "Small tools shaped around the actual operation",
          body: "Supports handoffs, invoices, inventory, schedules, and other field workflows without forcing a full system replacement.",
        },
      ]
    : [
        {
          name: "Shinba Report",
          label: "主力サービス",
          href: "/report",
          icon: FileText,
          title: "月次レポート・海外オーナー報告を整える",
          body: "写真、体重、コメント、所見をまとめ、馬主へ送れる日本語・英語・日英併記のレポートにします。",
        },
        {
          name: "Shinba Handoff",
          label: "準備中",
          href: "mailto:contact@shinba.app?subject=Shinba%20Handoff%20%E7%9B%B8%E8%AB%87",
          icon: MessagesSquare,
          title: "母国語の違うスタッフ同士でも、伝わる現場コミュニケーションへ",
          body: "日本語や英語が得意でないスタッフにも、片言の指示ではなく、それぞれの母国語で注意事項、申し送り、馬の状態を共有できる仕組みを準備中です。将来的には牧場独自の固有名詞や言い回しにも対応し、大切な馬の管理レベルを上げるコミュニケーション基盤を目指します。",
        },
        {
          name: "Voice & Vet Notes",
          label: "相談受付中",
          href: "mailto:contact@shinba.app?subject=Shinba%20%E5%80%8B%E5%88%A5%E7%9B%B8%E8%AB%87",
          icon: Mic,
          title: "音声メモや獣医共有メモを記録に変える",
          body: "診療、ケア、調教、申し送りの音声やメモを、あとから確認しやすい業務記録へ整理します。",
        },
        {
          name: "Workflow Build",
          label: "個別開発",
          href: "mailto:contact@shinba.app?subject=Shinba%20%E6%A5%AD%E5%8B%99%E3%83%84%E3%83%BC%E3%83%AB%E7%9B%B8%E8%AB%87",
          icon: PenTool,
          title: "現場に合わせた小さな業務ツールを作る",
          body: "引き継ぎ、請求、在庫、予定管理など、既存の運用を崩さずに小さく始められる形にします。",
        },
      ];

  return (
    <main className="min-h-screen bg-[#f8f3ea] text-[#172e2a]">
      <section className="relative overflow-hidden bg-[#102f2b] text-white">
        <Image
          src="/shinba-nature.svg"
          alt=""
          fill
          priority
          className="pointer-events-none object-cover opacity-20 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[linear-gradient(128deg,rgba(8,30,28,0.96)_0%,rgba(18,58,50,0.9)_42%,rgba(7,25,23,0.98)_100%)]" />
        <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(115deg,transparent_0%,rgba(224,189,115,0.12)_26%,transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.08)_0,transparent_18%,transparent_100%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e0bd73]/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[#f8f3ea]" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display text-3xl text-white">Shinba Service</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/88 md:flex">
            <a href="#services" className="transition hover:text-white">
              Services
            </a>
            <a href="#consultation" className="transition hover:text-white">
              Consultation
            </a>
            <Link href="/report" className="transition hover:text-white">
              Shinba Report
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-white/92 px-2 py-1">
              <LanguageToggle />
            </div>
            <a
              href="mailto:contact@shinba.app?subject=Shinba%20Service%20Consultation"
              className="inline-flex items-center gap-2 rounded-md bg-[#e0bd73] px-4 py-2 text-sm font-semibold text-[#13251f] transition hover:brightness-105"
            >
              <Mail className="h-4 w-4" />
              {copy.consult}
            </a>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-10 px-5 pb-32 pt-12 md:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.78fr)] lg:items-center lg:pb-40 lg:pt-20">
          <div className="max-w-[780px]">
            <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f1cf83]">
              <span className="h-px w-10 bg-[#e0bd73]" />
              {copy.eyebrow}
            </p>
            <h1 className="mt-5 text-balance font-display text-[3.25rem] leading-[1.02] text-white sm:text-[4.2rem] lg:text-[5rem]">
              {copy.headline}
            </h1>
            <p className="mt-6 max-w-[700px] text-lg leading-9 text-white/88">
              {copy.lead}
              <br />
              {copy.lead2}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:contact@shinba.app?subject=Shinba%20%E5%80%8B%E5%88%A5%E7%9B%B8%E8%AB%87&body=%E7%8F%BE%E5%9C%A8%E3%81%AE%E5%A0%B1%E5%91%8A%E6%A5%AD%E5%8B%99%E3%82%84%E8%A8%98%E9%8C%B2%E9%81%8B%E7%94%A8%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E7%9B%B8%E8%AB%87%E3%81%97%E3%81%9F%E3%81%84%E3%81%A7%E3%81%99%E3%80%82"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e0bd73] px-6 py-3 text-sm font-semibold text-[#13251f] transition hover:brightness-105"
              >
                {copy.primary}
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                {copy.secondary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-5 text-sm leading-7 text-white/76">
              {copy.note}
            </p>
          </div>

          <div className="relative rounded-lg border border-white/22 bg-[#fffdf8] p-2 shadow-[0_28px_90px_-42px_rgba(0,0,0,0.6)]">
            <div className="relative aspect-[920/734] overflow-hidden rounded-md bg-[#fffdf8]">
              <Image
                src="/shinba-service-logo-cropped.png"
                alt="Shinba Service"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-6 w-full max-w-[1200px] px-5 md:px-8">
        <div className="grid gap-4 rounded-lg border border-[#e3d3b8] bg-[#fffaf1] p-4 shadow-[0_24px_70px_-48px_rgba(54,40,20,0.5)] md:grid-cols-3 md:p-5">
          {valuesToShow.map((value) => {
            const Icon = value.icon;
            return (
              <article key={value.title} className="rounded-md bg-white p-5">
                <Icon className="h-6 w-6 text-[#a56a32]" />
                <h2 className="mt-4 font-display text-2xl text-[#183c32]">{value.title}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">{value.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-8">
        <div className="grid gap-8 rounded-lg border border-[#e3d3b8] bg-[#fffaf1] p-5 shadow-[0_24px_70px_-56px_rgba(54,40,20,0.45)] md:p-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center">
          <div className="overflow-hidden rounded-lg border border-[#d9c49c] bg-[#183c32] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div className="relative mx-auto aspect-[920/734] max-w-[300px] overflow-hidden rounded-md bg-[#fffdf8]">
              <Image
                src="/shinba-service-logo-cropped.png"
                alt="Shinba Service"
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-5 border-t border-white/15 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#e0bd73]">
                {copy.profileLabel}
              </p>
              <p className="mt-3 font-display text-3xl leading-tight">{copy.profileCard}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">
              {copy.profileEyebrow}
            </p>
            <h2 className="mt-4 max-w-[760px] font-display text-[2.75rem] leading-none text-[#183c32]">
              {copy.profileTitle}
            </h2>
            <p className="mt-5 max-w-[820px] text-sm leading-8 text-stone-700">
              {copy.profileBody}
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {steps.map(([label, body]) => (
                <div key={label} className="rounded-md border border-[#e3d3b8] bg-white px-4 py-4">
                  <p className="font-display text-2xl text-[#183c32]">{label}</p>
                  <p className="mt-2 text-xs leading-6 text-stone-600">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">
              Services
            </p>
            <h2 className="mt-4 font-display text-[2.75rem] leading-none text-[#183c32]">
              {copy.servicesTitle}
            </h2>
            <p className="mt-5 text-sm leading-8 text-stone-700">
              {copy.servicesBody}
            </p>
          </div>

          <div className="grid gap-4">
            {productsToShow.map((product) => {
              const Icon = product.icon;
              const isInternal = product.href.startsWith("/");
              const content = (
                <>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#183c32] text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-3xl leading-tight text-[#183c32]">{product.name}</h3>
                      <span className="rounded-full bg-[#e9ddc6] px-3 py-1 text-[11px] font-semibold text-[#79501f]">
                        {product.label}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-[#2d6156]">{product.title}</p>
                    <p className="mt-2 text-sm leading-7 text-stone-700">{product.body}</p>
                  </div>
                  <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-[#a56a32]" />
                </>
              );

              const className =
                "group flex gap-4 rounded-lg border border-[#e3d3b8] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#c99b52] hover:shadow-[0_22px_60px_-44px_rgba(54,40,20,0.55)]";

              return isInternal ? (
                <Link key={product.name} href={product.href} className={className}>
                  {content}
                </Link>
              ) : (
                <a key={product.name} href={product.href} className={className}>
                  {content}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[#d8c39d] bg-[#193d36] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f302c_0%,#1f4c42_46%,#102d29_100%)]" />
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(120deg,transparent_0%,rgba(224,189,115,0.16)_24%,transparent_43%),linear-gradient(180deg,rgba(255,255,255,0.07)_0,transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e0bd73]/70 to-transparent" />
        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f1cf83]">
              Shinba Report
            </p>
            <h2 className="mt-4 font-display text-[2.8rem] leading-none text-white">
              {copy.reportTitle}
            </h2>
            <p className="mt-5 max-w-[720px] text-sm leading-8 text-white/82">
              {copy.reportBody}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e0bd73] px-6 py-3 text-sm font-semibold text-[#13251f] transition hover:brightness-105"
              >
                {copy.reportCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:contact@shinba.app?subject=Shinba%20Report%20%E5%B0%8E%E5%85%A5%E7%9B%B8%E8%AB%87"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                {copy.discussOne}
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-lg border border-[#d9c49c] bg-white shadow-[0_24px_70px_-50px_rgba(54,40,20,0.5)]">
              <div className="border-b border-[#e7d8bd] bg-[#fbf7ef] px-4 py-2 text-xs font-semibold text-stone-700">
                Shinba Report preview
              </div>
              <Image
                src="/lp-report-shot.png"
                alt="Shinba Reportのレポート作成画面"
                width={1270}
                height={846}
                className="aspect-[1270/846] w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="consultation" className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">
            Consultation
          </p>
          <h2 className="mt-4 font-display text-[2.75rem] leading-none text-[#183c32]">
            {copy.consultationTitle}
          </h2>
          <p className="mt-5 text-sm leading-8 text-stone-700">
            {copy.consultationBody}
          </p>
          <ul className="mt-6 grid gap-3">
            {situationsToShow.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-7 text-stone-700">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#a56a32]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-[#e3d3b8] bg-white p-6 shadow-[0_24px_70px_-52px_rgba(54,40,20,0.45)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">
            How it starts
          </p>
          <div className="mt-6 grid gap-4">
            {consultationStepsToShow.map((step, index) => (
              <div key={step} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 rounded-md bg-[#f8f3ea] p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#183c32] font-display text-xl text-white">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <p className="self-center text-sm font-medium leading-7 text-stone-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#183c32]">
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#0d2b27_0%,#1f4a3f_52%,#0b2724_100%)]" />
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(118deg,transparent_0%,rgba(224,189,115,0.14)_28%,transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.08)_0,transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:68px_68px]" />
        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-16 text-white md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e0bd73]">
              Next action
            </p>
            <h2 className="mt-4 font-display text-[3rem] leading-none">
              {copy.nextTitle}
            </h2>
            <p className="mt-5 max-w-[760px] text-sm leading-8 text-white/72">
              {copy.nextBody}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="mailto:contact@shinba.app?subject=Shinba%20%E5%80%8B%E5%88%A5%E7%9B%B8%E8%AB%87"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e0bd73] px-6 py-3 text-sm font-semibold text-[#13251f] transition hover:brightness-105"
            >
              {copy.primary}
              <Mail className="h-4 w-4" />
            </a>
            <Link
              href="/report"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-white/8 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              {copy.details}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
