'use client';

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

const legalLinks = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/refund", label: "Refund & Cancellation" },
  { href: "/legal/commercial", label: "Commercial Disclosure" },
];

export default function PublicSiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-black/10 bg-[#1f1a14] text-white/60">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="font-display text-2xl text-white/90">Shinba Report</p>
          <p className="mt-2">{t('contact')}: contact@shinba.app</p>
          <p className="text-white/45">{t('footerSellerLine')}</p>
        </div>
        <nav className="flex flex-wrap gap-4">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.href === '/legal/terms'
                ? t('legalTerms')
                : link.href === '/legal/privacy'
                  ? t('legalPrivacy')
                  : link.href === '/legal/refund'
                    ? t('legalRefund')
                    : t('legalCommercial')}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
