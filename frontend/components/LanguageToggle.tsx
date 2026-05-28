'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
    const { language, setLanguage } = useLanguage();
    const options = [
        { value: 'ja' as const, label: 'JP', ariaLabel: 'Switch to Japanese' },
        { value: 'en' as const, label: 'EN', ariaLabel: 'Switch to English' },
    ];

    return (
        <div
            className="inline-flex items-center rounded-md border border-stone-200 bg-white p-0.5 shadow-sm no-print"
            role="group"
            aria-label="Language"
        >
            {options.map((option) => {
                const active = language === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-label={option.ariaLabel}
                        aria-pressed={active}
                        onClick={() => setLanguage(option.value)}
                        className={`min-w-9 rounded px-2.5 py-1.5 text-xs font-semibold leading-none transition-colors ${active
                            ? 'bg-[#1a3c34] text-white shadow-sm'
                            : 'text-stone-500 hover:bg-stone-50 hover:text-[#1a3c34]'
                            }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
