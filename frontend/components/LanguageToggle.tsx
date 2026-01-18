'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex flex-row items-center justify-center gap-0 lg:gap-1 p-0 lg:p-1 no-print">
            <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs lg:text-sm font-medium transition-colors relative ${language === 'en'
                    ? 'text-[#1a3c34]'
                    : 'text-stone-400 hover:text-[#1a3c34]'
                    }`}
            >
                EN
                {language === 'en' && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1a3c34]" />
                )}
            </button>
            <span className="hidden lg:inline text-stone-300">/</span>
            <button
                onClick={() => setLanguage('ja')}
                className={`px-2 py-1 text-xs lg:text-sm font-medium transition-colors relative ${language === 'ja'
                    ? 'text-[#1a3c34]'
                    : 'text-stone-400 hover:text-[#1a3c34]'
                    }`}
            >
                JP
                {language === 'ja' && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1a3c34]" />
                )}
            </button>
        </div>
    );
}
