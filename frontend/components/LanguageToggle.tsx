'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-1 no-print">
            <button
                onClick={() => setLanguage('ja')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${language === 'ja'
                        ? 'bg-[#1a3c34] text-white font-bold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
            >
                JP
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${language === 'en'
                        ? 'bg-[#1a3c34] text-white font-bold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
            >
                EN
            </button>
        </div>
    );
}
