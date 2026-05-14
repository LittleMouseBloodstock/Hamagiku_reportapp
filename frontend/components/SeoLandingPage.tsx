import Link from "next/link";
import PublicSiteFooter from "@/components/PublicSiteFooter";

type SeoSection = {
  title: string;
  body: string;
};

type SeoFaq = {
  q: string;
  a: string;
};

type RelatedLink = {
  href: string;
  label: string;
};

type SeoLandingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
  relatedLinks: RelatedLink[];
};

export default function SeoLandingPage({
  eyebrow,
  title,
  description,
  primaryCta,
  sections,
  faqs,
  relatedLinks,
}: SeoLandingPageProps) {
  return (
    <main className="min-h-screen bg-[#f6f0e7] text-[#183c32]">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="font-display text-3xl tracking-tight text-[#183c32]">
          Shinba Report
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-[#183c32] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2b24]"
        >
          ログイン
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pt-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a8783d]">
            {eyebrow}
          </p>
          <h1 className="mt-5 font-display text-[3rem] leading-[0.98] tracking-[-0.04em] text-[#123a31] md:text-[5rem]">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-700 md:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#183c32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2b24]"
            >
              {primaryCta}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[#cdbd9d] bg-white/55 px-6 py-3 text-sm font-semibold text-[#183c32] transition hover:bg-white"
            >
              トップへ戻る
            </Link>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[#e0d0ad] bg-[#fbf7ec] p-6 shadow-[0_18px_50px_rgba(64,48,30,0.12)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a8783d]">
            What Shinba Report handles
          </p>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-stone-700">
            <li>写真、体重、コメント、所見を馬ごとに整理</li>
            <li>日本語・英語・日英併記の月次レポート作成</li>
            <li>海外オーナーや馬主向けの近況報告</li>
            <li>Pro / Premium では調教師情報やケア記録も反映</li>
          </ul>
        </aside>
      </section>

      <section className="mx-auto grid w-full max-w-[1120px] gap-5 px-5 pb-16 md:grid-cols-3 md:px-8">
        {sections.map((section) => (
          <article key={section.title} className="rounded-[1.5rem] border border-[#e0d0ad] bg-white/70 p-6">
            <h2 className="font-display text-3xl leading-tight text-[#123a31]">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-5 pb-16 md:px-8">
        <div className="rounded-[2rem] bg-[#123a31] p-7 text-white md:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d8b46e]">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight">導入前によくある質問</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-2xl border border-white/15 bg-white/8 p-5">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-7 text-white/75">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-5 pb-20 md:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a8783d]">
          Related pages
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-[#cdbd9d] bg-white/60 px-4 py-2 text-sm text-[#183c32] transition hover:bg-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
