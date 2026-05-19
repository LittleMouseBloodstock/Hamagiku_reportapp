"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Languages,
  Mail,
  MessageCircle,
  MessagesSquare,
  Route,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { language } = useLanguage();
  const en = language === "en";

  const copy = {
    contact: en ? "Contact" : "相談する",
    navWhy: en ? "Why now" : "課題",
    navProducts: en ? "Products" : "プロダクト",
    navFounder: en ? "Founder" : "背景",
    eyebrow: en ? "Racehorse operations, reporting, and handoff" : "Racehorse operations, reporting, and handoff",
    headline: en
      ? "Turn field information into trusted reports and handoffs."
      : "現場に散らばる情報を、信頼できる報告・共有・判断へ。",
    lead: en
      ? "Shinba Service is a product group started from the field experience of an active racehorse veterinarian. It supports reporting, records, multilingual handoff, and practical workflow design for racehorse operations."
      : "Shinba Service は、現役競走馬獣医師の現場経験を起点に、競走馬の報告、記録、多言語Handoff、現場ごとの業務設計を支援するプロダクト群です。",
    subLead: en
      ? "It is not a generic AI app, translation tool, or task manager. The goal is to reduce misunderstanding and help people make better decisions around horses."
      : "単なるAIアプリ、翻訳ツール、タスク管理ではありません。馬に関わる人たちが、誤解を減らし、より良い判断をするための情報基盤を目指します。",
    primary: en ? "Request consultation" : "個別相談をする",
    secondary: en ? "View Shinba Report" : "Shinba Reportを見る",
    heroNote: en
      ? "Start small: one current report, one handoff flow, or one field workflow."
      : "最初は小さく。今の報告書1件、申し送りの流れ1つ、現場業務1つから確認します。",
    whyEyebrow: en ? "Why now" : "Why now",
    whyTitle: en ? "The issue is not lack of effort. It is fragmented information." : "課題は、努力不足ではなく、情報が分散してしまうこと。",
    whyBody: en
      ? "Racehorse operations depend on careful people and fast communication. Yet important details often stay in conversations, photos, LINE messages, paper notes, Excel, and memory."
      : "競走馬の現場は、丁寧な人の判断と速い連携で成り立っています。一方で、重要な情報は口頭、写真、LINE、紙のメモ、Excel、個人の記憶に分散しがちです。",
    missionEyebrow: en ? "Vision / Mission" : "Vision / Mission",
    missionTitle: en ? "Preserve field knowledge and make it usable across language, role, and border." : "現場知を失わせず、言語・職種・国境を越えて使える形へ。",
    missionBody: en
      ? "Japan's racehorse industry has strong practical knowledge, careful management, and high-quality horsemanship. Shinba aims to make that value visible, transferable, and useful for the next generation without replacing expert judgment."
      : "日本の競走馬産業には、高い現場技術、丁寧な管理、優れた馬づくりの文化があります。Shinbaは、その価値を失わせるのではなく、可視化し、伝達し、次世代に残すための仕組みを作ります。",
    missionNote: en
      ? "Data Input + Expert Interpretation. Technology supports judgment; it does not replace the specialist."
      : "Data Input + Expert Interpretation。テクノロジーは専門家の判断を置き換えるのではなく、判断に必要な情報を整えるために使います。",
    productsEyebrow: en ? "Product pillars" : "Product pillars",
    productsTitle: en ? "Start with the visible pain points." : "まずは、見えている課題から整える。",
    productsBody: en
      ? "The hub explains the vision. Each product can go deeper into its own use case, workflow, and implementation."
      : "ハブLPではShinba全体の思想を伝え、各サービスページではユースケースと具体的な導入方法を深掘りします。",
    principlesEyebrow: en ? "Design principles" : "Design principles",
    principlesTitle: en ? "Trust comes before automation." : "自動化より先に、信頼できる運用をつくる。",
    principlesBody: en
      ? "In racehorse operations, poor translation, missing instructions, unclear completion, or overconfident generated text can damage trust. Shinba is designed around source records, confirmation, and human responsibility."
      : "競走馬ビジネスでは、誤訳、伝達漏れ、完了確認の曖昧さ、過剰な自動生成が信頼を損なう可能性があります。Shinbaでは、原文、確認、履歴、人の責任を中心に設計します。",
    founderEyebrow: en ? "Founder story" : "Founder story",
    founderTitle: en
      ? "Built from conversations in the field, not from a generic SaaS template."
      : "汎用SaaSの型ではなく、現場の会話から作る。",
    founderBody: en
      ? "Report writing, English updates, voice notes, treatment records, handoff, photos, and weight records all vary by farm and team. Shinba starts by listening to the current operation, then shapes only the necessary parts into practical workflows."
      : "報告文の作成、英語での近況共有、音声メモ、治療記録、申し送り、写真や体重の整理。こうした業務は現場ごとのやり方が強く、既製品を入れるだけではうまく収まりにくいことがあります。だから最初に今の運用を聞き、必要な部分だけを使いやすい形に整えます。",
    ctaEyebrow: en ? "Next action" : "Next action",
    ctaTitle: en ? "Show one real workflow first." : "まずは、今の業務を1つだけ見せてください。",
    ctaBody: en
      ? "With existing notes, reports, photos, messages, or handoff routines, we identify where Shinba should begin. If it fits, we can move into Shinba Report, Handoff preparation, or a tailored small workflow."
      : "既存のメモ、レポート、写真、LINE文面、申し送りの流れを見ながら、Shinbaでどこから整えるべきかを確認します。合いそうであれば、Shinba Report、Handoff準備、個別の小さな仕組みづくりへ進めます。",
  };

  const whyItems = en
    ? [
        { icon: FileText, title: "Information gaps", body: "Important details remain across LINE, paper, spreadsheets, photos, and individual memory." },
        { icon: Languages, title: "Language gaps", body: "Foreign staff and overseas owners need communication that preserves meaning, not rough instruction." },
        { icon: Route, title: "Workflow gaps", body: "Important routines depend on individual habits and are hard to hand over consistently." },
      ]
    : [
        { icon: FileText, title: "情報格差", body: "LINE、紙、Excel、写真、個人の記憶に重要情報が分散し、あとから確認しにくくなります。" },
        { icon: Languages, title: "言語格差", body: "外国人スタッフや海外馬主には、片言ではなく、意味が保たれたコミュニケーションが必要です。" },
        { icon: Route, title: "運用格差", body: "大切な業務が人ごとのやり方に依存し、同じ品質で引き継ぎにくいことがあります。" },
      ];

  const productPillars = en
    ? [
        {
          name: "Shinba Report",
          label: "Live",
          href: "/report",
          icon: FileText,
          title: "Owner reporting",
          body: "Convert notes, photos, weight, and observations into Japanese, English, or bilingual reports without losing field nuance.",
          cta: "View details",
        },
        {
          name: "Shinba Handoff",
          label: "Preparing",
          href: "mailto:contact@shinba.app?subject=Shinba%20Handoff%20Pilot",
          icon: MessagesSquare,
          title: "Multilingual handoff",
          body: "Support seen, understood, done, completion reported, and manager confirmed across staff with different native languages.",
          cta: "Discuss pilot",
        },
        {
          name: "Custom Workflow",
          label: "By consultation",
          href: "mailto:contact@shinba.app?subject=Shinba%20Service%20Workflow%20Consultation",
          icon: Route,
          title: "Small workflow design",
          body: "After understanding the current operation, shape only the necessary parts of reporting, records, and handoff into a practical workflow.",
          cta: "Discuss workflow",
        },
      ]
    : [
        {
          name: "Shinba Report",
          label: "公開中",
          href: "/report",
          icon: FileText,
          title: "Owner Reporting",
          body: "メモ、写真、体重、所見を、現場のニュアンスを失わず、馬主や海外関係者が理解しやすい報告へ整えます。",
          cta: "詳細を見る",
        },
        {
          name: "Shinba Handoff",
          label: "準備中",
          href: "mailto:contact@shinba.app?subject=Shinba%20Handoff%20%E3%83%91%E3%82%A4%E3%83%AD%E3%83%83%E3%83%88%E7%9B%B8%E8%AB%87",
          icon: MessagesSquare,
          title: "Multilingual Handoff",
          body: "母国語の異なるスタッフ間で、「見た」「理解した」「作業した」「完了報告した」「管理者が確認した」を分けて扱います。",
          cta: "パイロット相談",
        },
        {
          name: "Custom Workflow",
          label: "個別相談",
          href: "mailto:contact@shinba.app?subject=Shinba%20Service%20%E5%80%8B%E5%88%A5%E6%A5%AD%E5%8B%99%E8%A8%AD%E8%A8%88",
          icon: Route,
          title: "小さな業務設計",
          body: "今の運用を確認したうえで、報告・記録・申し送りのうち、必要な部分だけを現場で使える形に整えます。",
          cta: "業務を相談",
        },
      ];

  const principles = en
    ? [
        { icon: MessageCircle, title: "Reduce field burden", body: "Smartphone-first, short input, voice, photos, templates, and one-tap actions." },
        { icon: ShieldCheck, title: "Preserve responsibility", body: "Keep originals, edits, confirmations, and the human responsible for final judgment." },
        { icon: Stethoscope, title: "Support specialists", body: "Organize information for veterinarians, staff, managers, owners, and experts. Do not replace them." },
        { icon: ClipboardCheck, title: "Make status explicit", body: "Do not mix seen, understood, done, reported, and confirmed." },
      ]
    : [
        { icon: MessageCircle, title: "現場負担を増やさない", body: "スマホ前提、短い入力、音声、写真、定型文、ワンタップ操作を優先します。" },
        { icon: ShieldCheck, title: "責任の所在を残す", body: "原文、修正、確認、最終判断を行う人がわかる形を重視します。" },
        { icon: Stethoscope, title: "専門家を支える", body: "獣医師、スタッフ、管理者、馬主、専門家の判断を置き換えず、情報を整理します。" },
        { icon: ClipboardCheck, title: "状態を混同しない", body: "見た、理解した、作業した、完了報告した、管理者が確認した、を分けて扱います。" },
      ];

  const startSteps = en
    ? [
        "Share one current report, handoff routine, or field message flow.",
        "Separate what can be structured from what must remain expert judgment.",
        "Test with one sample before moving into a monthly plan or pilot.",
      ]
    : [
        "今の報告書、申し送り、LINE文面などを1つ確認します。",
        "仕組み化できる部分と、専門家が判断すべき部分を切り分けます。",
        "1件分のサンプルで確認してから、月額運用やパイロットへ進みます。",
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
        <div className="absolute inset-0 bg-[linear-gradient(128deg,rgba(8,30,28,0.97)_0%,rgba(18,58,50,0.9)_42%,rgba(7,25,23,0.98)_100%)]" />
        <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(115deg,transparent_0%,rgba(224,189,115,0.12)_26%,transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.08)_0,transparent_18%,transparent_100%)]" />
        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e0bd73]/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[#f8f3ea]" />

        <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="font-display text-3xl text-white">
            Shinba Service
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/88 md:flex">
            <a href="#why" className="transition hover:text-white">{copy.navWhy}</a>
            <a href="#products" className="transition hover:text-white">{copy.navProducts}</a>
            <a href="#founder" className="transition hover:text-white">{copy.navFounder}</a>
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
              {copy.contact}
            </a>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-10 px-5 pb-32 pt-12 md:px-8 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,0.72fr)] lg:items-center lg:pb-40 lg:pt-20">
          <div className="max-w-[820px]">
            <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f1cf83]">
              <span className="h-px w-10 bg-[#e0bd73]" />
              {copy.eyebrow}
            </p>
            <h1 className="mt-5 max-w-[680px] text-balance font-display text-[2.65rem] leading-[1.08] text-white sm:text-[3.35rem] lg:text-[3.9rem]">
              {copy.headline}
            </h1>
            <p className="mt-6 max-w-[760px] text-lg leading-9 text-white/88">
              {copy.lead}
            </p>
            <p className="mt-4 max-w-[760px] text-sm leading-7 text-white/72">
              {copy.subLead}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:contact@shinba.app?subject=Shinba%20Service%20%E5%80%8B%E5%88%A5%E7%9B%B8%E8%AB%87"
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
            <p className="mt-5 text-sm leading-7 text-white/76">{copy.heroNote}</p>
          </div>

          <div className="relative w-full max-w-[520px] justify-self-center rounded-lg border border-white/22 bg-[#fffdf8] p-2 shadow-[0_28px_90px_-42px_rgba(0,0,0,0.6)]">
            <div className="relative overflow-hidden rounded-md bg-[#fffdf8]" style={{ aspectRatio: "920 / 734" }}>
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

      <section id="why" className="relative z-20 mx-auto -mt-6 w-full max-w-[1200px] px-5 md:px-8">
        <div className="rounded-lg border border-[#e3d3b8] bg-[#fffaf1] p-5 shadow-[0_24px_70px_-48px_rgba(54,40,20,0.5)] md:p-7">
          <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">{copy.whyEyebrow}</p>
              <h2 className="mt-4 font-display text-[2.7rem] leading-none text-[#183c32]">{copy.whyTitle}</h2>
              <p className="mt-5 text-sm leading-8 text-stone-700">{copy.whyBody}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {whyItems.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-md bg-white p-5">
                    <Icon className="h-6 w-6 text-[#a56a32]" />
                    <h3 className="mt-4 font-display text-2xl text-[#183c32]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">{copy.missionEyebrow}</p>
            <h2 className="mt-4 max-w-[760px] font-display text-[2.9rem] leading-none text-[#183c32]">
              {copy.missionTitle}
            </h2>
            <p className="mt-5 text-sm leading-8 text-stone-700">{copy.missionBody}</p>
            <p className="mt-5 rounded-md border border-[#e3d3b8] bg-[#fffaf1] px-4 py-4 text-sm font-medium leading-7 text-[#234a40]">
              {copy.missionNote}
            </p>
          </div>
          <div className="rounded-lg border border-[#d9c49c] bg-[#183c32] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="relative mx-auto max-w-[310px] overflow-hidden rounded-md bg-[#fffdf8]" style={{ aspectRatio: "920 / 734" }}>
              <Image src="/shinba-service-logo-cropped.png" alt="Shinba Service" fill className="object-contain" />
            </div>
            <div className="mt-5 grid gap-3 border-t border-white/15 pt-5">
              {startSteps.map((step, index) => (
                <div key={step} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 rounded-md bg-white/8 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e0bd73] font-display text-lg text-[#13251f]">
                    {index + 1}
                  </div>
                  <p className="self-center text-sm leading-6 text-white/82">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="bg-[#fffaf1]">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-8">
          <div className="max-w-[760px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">{copy.productsEyebrow}</p>
            <h2 className="mt-4 font-display text-[2.9rem] leading-none text-[#183c32]">{copy.productsTitle}</h2>
            <p className="mt-5 text-sm leading-8 text-stone-700">{copy.productsBody}</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {productPillars.map((product) => {
              const Icon = product.icon;
              const isInternal = product.href.startsWith("/");
              const content = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#183c32] text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-[#e9ddc6] px-3 py-1 text-[11px] font-semibold text-[#79501f]">{product.label}</span>
                  </div>
                  <h3 className="mt-5 font-display text-3xl leading-tight text-[#183c32]">{product.name}</h3>
                  <p className="mt-2 font-semibold text-[#2d6156]">{product.title}</p>
                  <p className="mt-3 min-h-[112px] text-sm leading-7 text-stone-700">{product.body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8a5b24]">
                    {product.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </>
              );

              const className = "group block rounded-lg border border-[#e3d3b8] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#c99b52] hover:shadow-[0_22px_60px_-44px_rgba(54,40,20,0.55)]";
              return isInternal ? (
                <Link key={product.name} href={product.href} className={className}>{content}</Link>
              ) : (
                <a key={product.name} href={product.href} className={className}>{content}</a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">{copy.principlesEyebrow}</p>
            <h2 className="mt-4 font-display text-[2.75rem] leading-none text-[#183c32]">{copy.principlesTitle}</h2>
            <p className="mt-5 text-sm leading-8 text-stone-700">{copy.principlesBody}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {principles.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-[#e3d3b8] bg-white p-5">
                  <Icon className="h-6 w-6 text-[#a56a32]" />
                  <h3 className="mt-4 font-display text-2xl leading-tight text-[#183c32]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-700">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="founder" className="relative overflow-hidden border-y border-[#d8c39d] bg-[#193d36] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f302c_0%,#1f4c42_46%,#102d29_100%)]" />
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(120deg,transparent_0%,rgba(224,189,115,0.16)_24%,transparent_43%),linear-gradient(180deg,rgba(255,255,255,0.07)_0,transparent_28%)]" />
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e0bd73]/70 to-transparent" />
        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-20 md:px-8 lg:grid-cols-[minmax(0,0.95fr)_420px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f1cf83]">{copy.founderEyebrow}</p>
            <h2 className="mt-4 max-w-[720px] font-display text-[2.45rem] leading-[1.12] text-white sm:text-[3rem]">{copy.founderTitle}</h2>
            <p className="mt-5 max-w-[760px] text-sm leading-8 text-white/82">{copy.founderBody}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:contact@shinba.app?subject=Shinba%20Service%20Consultation"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e0bd73] px-6 py-3 text-sm font-semibold text-[#13251f] transition hover:brightness-105"
              >
                {copy.primary}
                <Mail className="h-4 w-4" />
              </a>
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                {copy.secondary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/18 bg-white/8 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f1cf83]">
              Shinba Service
            </p>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-white/82">
              {(en
                ? ["Veterinarian-led field perspective", "Owner reporting first", "Handoff and field workflow next"]
                : ["現役競走馬獣医師の現場視点", "まずは馬主向け報告から", "次にHandoffと現場業務の整備へ"]
              ).map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#e0bd73]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative bg-[#f8f3ea] px-5 py-16 md:px-8">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 rounded-lg border border-[#e3d3b8] bg-[#fffaf1] p-6 shadow-[0_26px_80px_-58px_rgba(54,40,20,0.55)] md:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a56a32]">{copy.ctaEyebrow}</p>
            <h2 className="mt-4 max-w-[760px] font-display text-[2.45rem] leading-[1.12] text-[#183c32] sm:text-[3rem]">{copy.ctaTitle}</h2>
            <p className="mt-5 max-w-[760px] text-sm leading-8 text-stone-700">{copy.ctaBody}</p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="mailto:contact@shinba.app?subject=Shinba%20Service%20%E5%80%8B%E5%88%A5%E7%9B%B8%E8%AB%87"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e0bd73] px-6 py-3 text-sm font-semibold text-[#13251f] transition hover:brightness-105"
            >
              {copy.primary}
              <Mail className="h-4 w-4" />
            </a>
            <Link
              href="/report"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[#d9c49c] bg-white px-6 py-3 text-sm font-semibold text-[#183c32] transition hover:border-[#c99b52]"
            >
              {copy.secondary}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
