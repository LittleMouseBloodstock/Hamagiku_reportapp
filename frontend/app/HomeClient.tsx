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
  MessagesSquare,
  Route,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import PublicSiteFooter from "@/components/PublicSiteFooter";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

const mailto = "mailto:contact@shinba.app?subject=Shinba%20Service%20Consultation";

export default function Home() {
  const { language } = useLanguage();
  const en = language === "en";

  const copy = {
    navProblems: en ? "Issues" : "課題",
    navServices: en ? "Services" : "サービス",
    navFlow: en ? "Flow" : "流れ",
    contact: en ? "Consult" : "相談する",
    heroKicker: en ? "Racehorse reporting / multilingual handoff" : "Racehorse reporting / multilingual handoff",
    heroTitle: en
      ? "Make field information easy to report, share, and trust."
      : "現場の情報を、伝わる報告と共有へ。",
    heroLead: en
      ? "Shinba Service supports racehorse reporting, records, and multilingual handoff from the field experience of an active racehorse veterinarian."
      : "Shinba Service は、現役競走馬獣医師の現場経験を起点に、競走馬の報告・記録・多言語Handoffを現場に合う形へ整えます。",
    heroSub: en
      ? "Start with one real report or one handoff flow. We check whether it fits before asking for any long-term commitment."
      : "まずは1件分の報告、または1つの申し送りの流れから。長期契約の前に、現場に合うかを一緒に確認します。",
    primary: en ? "Request consultation" : "個別相談をする",
    secondary: en ? "View Shinba Report" : "Shinba Reportを見る",
    problemsTitle: en ? "Do these issues happen in your operation?" : "こんなお困りごとはありませんか？",
    problemsSub: en
      ? "The problem is often not effort. It is that information is spread across tools, people, and languages."
      : "問題は努力不足ではなく、情報がツール・人・言語をまたいで散らばってしまうことです。",
    solutionTitle: en ? "Shinba organizes only the parts that need organizing." : "Shinbaが、必要な部分だけを整えます。",
    solutionSub: en
      ? "It is not a generic AI app. The goal is to reduce misunderstanding and make daily reporting easier without replacing field judgment."
      : "汎用AIアプリではありません。現場判断を置き換えるのではなく、誤解を減らし、報告と共有を軽くするための仕組みです。",
    servicesTitle: en ? "Services" : "サービス",
    servicesSub: en
      ? "Start with the visible workflow. Expand only when it genuinely helps the field."
      : "まずは見えている業務から。現場に役立つ範囲だけ、必要に応じて広げます。",
    reportTitle: en ? "A practical first step: one owner report." : "最初の一歩は、馬主向け報告1件から。",
    reportBody: en
      ? "Use existing notes, photos, weights, and comments to create a sample owner report in Japanese, English, or bilingual format."
      : "既存のメモ、写真、体重、コメントをもとに、日本語・英語・日英併記の報告サンプルを作り、実務に合うか確認します。",
    flowTitle: en ? "How it starts" : "導入までの流れ",
    flowSub: en
      ? "The first goal is not a subscription. It is confirming fit with real field material."
      : "最初の目的は契約ではなく、実際の素材で合うかを確認することです。",
    faqTitle: en ? "Common questions" : "よくある質問",
    ctaTitle: en ? "Show one real workflow first." : "まずは、今の業務を1つだけ見せてください。",
    ctaBody: en
      ? "We can start from one report, one LINE thread, or one handoff routine. If it fits, we move to Shinba Report or a small pilot."
      : "報告書1件、LINE文面、申し送りの流れなど、実際の素材から確認します。合いそうであれば、Shinba Reportや小さなパイロットへ進みます。",
  };

  const problems = en
    ? [
        { icon: FileText, title: "Owner reports take too long", body: "Photos, weights, comments, and observations are spread across notes and messages." },
        { icon: Languages, title: "English reporting feels heavy", body: "Rough translation is not enough when nuance and trust matter." },
        { icon: MessagesSquare, title: "Handoff depends on people", body: "Seen, understood, done, reported, and confirmed often get mixed together." },
      ]
    : [
        { icon: FileText, title: "馬主向け報告に時間がかかる", body: "写真、体重、コメント、所見がメモやLINEに散らばり、毎回まとめ直す必要がある。" },
        { icon: Languages, title: "英語での報告が重い", body: "片言の翻訳では、現場のニュアンスや信頼感まで伝わりにくい。" },
        { icon: MessagesSquare, title: "申し送りが人に依存している", body: "見た、理解した、作業した、完了報告した、確認した、が混ざりやすい。" },
      ];

  const solutions = en
    ? [
        { icon: Stethoscope, title: "Field language first", body: "Designed around racehorse, farm, veterinary, and owner reporting context." },
        { icon: ShieldCheck, title: "Trust before automation", body: "Original information, confirmation, and human judgment remain central." },
        { icon: Route, title: "Small start", body: "Begin with one report or one handoff flow before changing the whole operation." },
      ]
    : [
        { icon: Stethoscope, title: "現場の言葉を前提にする", body: "競走馬、牧場、獣医、馬主報告の文脈に合わせて設計します。" },
        { icon: ShieldCheck, title: "自動化より信頼を優先する", body: "原文、確認、人の判断を残し、過剰な自動生成に寄せすぎません。" },
        { icon: Route, title: "小さく試してから進める", body: "全体導入ではなく、報告1件・申し送り1つから確認します。" },
      ];

  const services = en
    ? [
        { name: "Shinba Report", label: "Live", href: "/report", icon: FileText, title: "Owner reporting", body: "Turn notes, photos, weight, and comments into Japanese, English, or bilingual owner reports.", cta: "View details" },
        { name: "Shinba Handoff", label: "Preparing", href: mailto, icon: MessagesSquare, title: "Multilingual handoff", body: "Support staff with different native languages through clearer handoff and confirmation flows.", cta: "Discuss pilot" },
        { name: "Custom Workflow", label: "Consultation", href: mailto, icon: ClipboardCheck, title: "Small workflow design", body: "Shape only the necessary parts of reporting, records, and handoff into a practical workflow.", cta: "Discuss workflow" },
      ]
    : [
        { name: "Shinba Report", label: "公開中", href: "/report", icon: FileText, title: "馬主向け報告", body: "メモ、写真、体重、コメントを、日本語・英語・日英併記の報告へ整えます。", cta: "詳細を見る" },
        { name: "Shinba Handoff", label: "準備中", href: mailto, icon: MessagesSquare, title: "多言語Handoff", body: "母国語の異なるスタッフ間でも、指示・理解・完了報告・確認を分けて扱える形を目指します。", cta: "パイロット相談" },
        { name: "Custom Workflow", label: "個別相談", href: mailto, icon: ClipboardCheck, title: "小さな業務設計", body: "報告・記録・申し送りのうち、必要な部分だけを現場で使える形に整えます。", cta: "業務を相談" },
      ];

  const flow = en
    ? [
        ["01", "Share one example", "Send one current report, memo, photo set, or handoff flow."],
        ["02", "Find what should be structured", "Separate what can be organized from what should remain professional judgment."],
        ["03", "Create one sample", "Check wording, format, and workflow with one realistic sample."],
        ["04", "Decide the next step", "Move only if it fits: Report setup, Handoff pilot, or a small custom workflow."],
      ]
    : [
        ["01", "実例を1つ確認", "今の報告書、メモ、写真、LINE文面、申し送りの流れを1つ見せてください。"],
        ["02", "整える部分を切り分け", "仕組み化できる作業と、専門家が判断すべき作業を分けます。"],
        ["03", "サンプルを作成", "1件分の現実的なサンプルで、文面・形式・流れを確認します。"],
        ["04", "次の進め方を決める", "合いそうであれば、Report設定、Handoffパイロット、小さな個別設計へ進みます。"],
      ];

  const faqs = en
    ? [
        ["Do I need to subscribe first?", "No. The first step is consultation and one sample using real or anonymized material."],
        ["Is this an AI replacement for specialists?", "No. Shinba organizes information so specialists can make and communicate better judgments."],
        ["Can we start even if our current workflow is messy?", "Yes. The point is to look at the current workflow first and decide where to begin."],
      ]
    : [
        ["最初から契約が必要ですか？", "いいえ。まずは相談と1件分のサンプル確認から始めます。実データが難しければ匿名化した素材でも構いません。"],
        ["専門家の判断をAIで置き換えるものですか？", "いいえ。専門家が判断しやすく、関係者に伝えやすくするために情報を整理する仕組みです。"],
        ["今の運用が整理されていなくても相談できますか？", "できます。むしろ現在の運用を見ながら、どこから整えると効果が出るかを一緒に確認します。"],
      ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf1] text-[#17352f]">
      <section className="relative isolate overflow-hidden bg-[#fffaf1]" data-analytics-section="hero">
        <div className="absolute inset-y-0 left-0 -z-10 w-[42%] bg-[#f0c65f]" />
        <div className="absolute inset-y-0 left-[34%] -z-10 w-24 -skew-x-12 bg-[#f6e4ad]" />
        <div className="absolute inset-0 -z-10 opacity-[0.18] [background-image:linear-gradient(rgba(24,60,50,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(24,60,50,0.18)_1px,transparent_1px)] [background-size:56px_56px]" />

        <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-5 py-5 md:px-8">
          <Link href="/" className="font-display text-3xl font-semibold text-[#17352f]">
            Shinba Service
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#17352f]/80 lg:flex">
            <a href="#problems" data-analytics-event="nav_click" data-analytics-label="problems" className="hover:text-[#17352f]">{copy.navProblems}</a>
            <a href="#services" data-analytics-event="nav_click" data-analytics-label="services" className="hover:text-[#17352f]">{copy.navServices}</a>
            <a href="#flow" data-analytics-event="nav_click" data-analytics-label="flow" className="hover:text-[#17352f]">{copy.navFlow}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-[#ddc997] bg-white px-2 py-1">
              <LanguageToggle />
            </div>
            <a href={mailto} aria-label={copy.contact} data-analytics-event="contact_click" data-analytics-label="header_contact" className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#f0c65f] text-sm font-bold text-[#17352f] shadow-sm transition hover:brightness-105 sm:w-auto sm:px-4 sm:py-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.contact}</span>
            </a>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-5 pb-16 pt-10 md:px-8 lg:min-h-[690px] lg:grid-cols-[minmax(0,0.88fr)_minmax(440px,0.9fr)] lg:items-center lg:pb-20 lg:pt-12">
          <div className="min-w-0">
            <p className="max-w-full break-words text-[11px] font-bold uppercase leading-6 tracking-[0.16em] text-[#8b5a20] sm:text-xs sm:tracking-[0.22em]">{copy.heroKicker}</p>
            <h1 className="mt-5 max-w-[680px] break-words font-display text-[2.38rem] font-semibold leading-[1.1] text-[#17352f] sm:text-[4.2rem] lg:text-[5rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-6 max-w-[680px] text-lg font-medium leading-9 text-[#17352f]">{copy.heroLead}</p>
            <p className="mt-4 max-w-[620px] text-sm leading-8 text-stone-700">{copy.heroSub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={mailto} data-analytics-event="contact_click" data-analytics-label="hero_contact" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f0c65f] px-6 py-3 text-sm font-bold text-[#17352f] shadow-sm transition hover:brightness-105">
                {copy.primary}
                <Mail className="h-4 w-4" />
              </a>
              <Link href="/report" data-analytics-event="report_click" data-analytics-label="hero_report" className="inline-flex items-center justify-center gap-2 rounded-md border border-[#17352f]/25 bg-white px-6 py-3 text-sm font-semibold text-[#17352f] transition hover:border-[#17352f]">
                {copy.secondary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="absolute -inset-3 -z-10 rounded-lg bg-[#17352f] sm:-inset-5" />
            <div className="overflow-hidden rounded-lg border border-[#e2cf9a] bg-white p-3 shadow-[0_32px_90px_-58px_rgba(31,47,40,0.55)]">
              <div className="overflow-hidden rounded-md bg-[#fffdf8]">
                <Image src="/shinba-service-logo-cropped.png" alt="Shinba Service" width={920} height={734} priority className="h-auto w-full" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-[#17352f] sm:text-xs">
              {(en ? ["Reports", "Handoff", "Workflow"] : ["報告", "申し送り", "業務設計"]).map((item) => (
                <div key={item} className="rounded-md border border-[#e2cf9a] bg-white/92 px-2 py-2 sm:px-3">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="problems" className="relative bg-[#17352f] px-5 py-16 text-white md:px-8" data-analytics-section="problems">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="relative mx-auto w-full max-w-[1180px]">
          <div className="text-center">
            <h2 className="font-display text-[2.35rem] leading-tight sm:text-[3.2rem]">{copy.problemsTitle}</h2>
            <p className="mx-auto mt-4 max-w-[720px] text-sm leading-8 text-white/75">{copy.problemsSub}</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {problems.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="relative rounded-lg border border-white/14 bg-[#102823] p-6 shadow-[0_20px_60px_-46px_rgba(0,0,0,0.55)]">
                  <span className="absolute right-5 top-4 font-display text-5xl text-[#f0c65f]">{String(index + 1).padStart(2, "0")}</span>
                  <Icon className="h-8 w-8 text-[#f0c65f]" />
                  <h3 className="mt-6 pr-16 font-display text-2xl leading-tight text-white">{item.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-white/72">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#f0c65f] px-5 py-16 md:px-8" data-analytics-section="solution">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#17352f]/70">Solution</p>
            <h2 className="mt-3 font-display text-[2.35rem] leading-tight text-[#17352f] sm:text-[3.3rem]">{copy.solutionTitle}</h2>
            <p className="mx-auto mt-4 max-w-[760px] text-sm font-medium leading-8 text-[#17352f]/82">{copy.solutionSub}</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {solutions.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="relative rounded-lg bg-white p-6 shadow-[0_24px_70px_-55px_rgba(54,40,20,0.55)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#17352f] text-white">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl leading-tight text-[#17352f]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-700">{item.body}</p>
                  <span className="absolute right-5 top-5 font-display text-4xl text-[#f0c65f]/70">{String(index + 1).padStart(2, "0")}</span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="services" className="bg-[#fffaf1] px-5 py-16 md:px-8" data-analytics-section="services">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="grid gap-8 lg:grid-cols-[330px_minmax(0,1fr)] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9b6426]">{copy.servicesTitle}</p>
              <h2 className="mt-3 font-display text-[2.15rem] leading-tight text-[#17352f] sm:text-[2.65rem] sm:leading-none">{copy.servicesSub}</h2>
            </div>
            <p className="max-w-[720px] text-sm leading-8 text-stone-700">{copy.reportBody}</p>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              const isInternal = service.href.startsWith("/");
              const card = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#17352f] text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-[#f5e4aa] px-3 py-1 text-[11px] font-bold text-[#7b4f1f]">{service.label}</span>
                  </div>
                  <h3 className="mt-5 font-display text-3xl leading-tight text-[#17352f]">{service.name}</h3>
                  <p className="mt-2 font-semibold text-[#316154]">{service.title}</p>
                  <p className="mt-3 min-h-[104px] text-sm leading-7 text-stone-700">{service.body}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#8b5a20]">
                    {service.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </>
              );
              const className = "group block rounded-lg border border-[#e2cf9a] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#caa653] hover:shadow-[0_26px_70px_-55px_rgba(54,40,20,0.65)]";
              return isInternal ? (
                <Link key={service.name} href={service.href} className={className} data-analytics-event="product_click" data-analytics-label={service.name}>
                  {card}
                </Link>
              ) : (
                <a key={service.name} href={service.href} className={className} data-analytics-event="product_click" data-analytics-label={service.name}>
                  {card}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 md:px-8" data-analytics-section="report_sample">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,1fr)] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9b6426]">First case</p>
            <h2 className="mt-3 font-display text-[2.55rem] leading-tight text-[#17352f]">{copy.reportTitle}</h2>
            <p className="mt-5 text-sm leading-8 text-stone-700">{copy.reportBody}</p>
            <ul className="mt-6 grid gap-3 text-sm leading-7 text-stone-700">
              {(en
                ? ["Use real or anonymized material", "Check Japanese / English wording", "Move to setup only after fit is clear"]
                : ["実データまたは匿名化素材で確認", "日本語・英語の文面を確認", "合う場合だけ導入設定へ進む"]
              ).map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#9b6426]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#e2cf9a] bg-[#fffaf1] p-3 shadow-[0_24px_70px_-55px_rgba(54,40,20,0.55)]">
            <Image src={en ? "/lp-report-shot-en.png" : "/lp-report-shot.png"} alt="Shinba Report screen" width={1270} height={846} className="aspect-[1270/846] w-full rounded-md object-cover object-top" />
          </div>
        </div>
      </section>

      <section id="flow" className="bg-[#fffaf1] px-5 py-16 md:px-8" data-analytics-section="flow">
        <div className="mx-auto w-full max-w-[980px]">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9b6426]">Flow</p>
            <h2 className="mt-3 font-display text-[2.55rem] leading-tight text-[#17352f]">{copy.flowTitle}</h2>
            <p className="mx-auto mt-4 max-w-[700px] text-sm leading-8 text-stone-700">{copy.flowSub}</p>
          </div>
          <div className="mt-10 grid gap-4">
            {flow.map(([num, title, body]) => (
              <article key={num} className="grid gap-4 rounded-lg border border-[#e2cf9a] bg-white p-5 shadow-[0_18px_50px_-46px_rgba(54,40,20,0.55)] sm:grid-cols-[80px_minmax(0,1fr)]">
                <div className="flex h-16 w-16 items-center justify-center rounded-md bg-[#17352f] font-display text-2xl text-[#f0c65f]">{num}</div>
                <div>
                  <h3 className="font-display text-2xl text-[#17352f]">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-700">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 md:px-8" data-analytics-section="faq">
        <div className="mx-auto w-full max-w-[980px]">
          <h2 className="text-center font-display text-[2.55rem] leading-tight text-[#17352f]">{copy.faqTitle}</h2>
          <div className="mt-9 grid gap-4">
            {faqs.map(([question, answer]) => (
              <div key={question} className="rounded-lg border border-[#e2cf9a] bg-[#fffaf1] p-5">
                <h3 className="flex gap-3 font-semibold text-[#17352f]">
                  <span className="font-display text-2xl leading-none text-[#9b6426]">Q</span>
                  {question}
                </h3>
                <p className="mt-3 pl-9 text-sm leading-7 text-stone-700">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#17352f] px-5 py-16 text-white md:px-8" data-analytics-section="next_action">
        <div className="mx-auto grid w-full max-w-[1180px] gap-7 rounded-lg border border-white/14 bg-white/8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f0c65f]">Next action</p>
            <h2 className="mt-3 font-display text-[2.45rem] leading-tight sm:text-[3rem]">{copy.ctaTitle}</h2>
            <p className="mt-4 max-w-[760px] text-sm leading-8 text-white/75">{copy.ctaBody}</p>
          </div>
          <div className="flex flex-col gap-3">
            <a href={mailto} data-analytics-event="contact_click" data-analytics-label="final_contact" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f0c65f] px-6 py-3 text-sm font-bold text-[#17352f] transition hover:brightness-105">
              {copy.primary}
              <Mail className="h-4 w-4" />
            </a>
            <Link href="/report" data-analytics-event="report_click" data-analytics-label="final_report" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 bg-white/8 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/14">
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
