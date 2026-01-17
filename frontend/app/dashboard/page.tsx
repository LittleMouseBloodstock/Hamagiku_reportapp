'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dashboard() {
    const { language, setLanguage, t } = useLanguage();

    // Mock data based on the HTML provided
    const reports = [
        {
            id: 1,
            title: language === 'ja' ? "ハマギク" : "Hamagiku",
            created: "Oct 24, 2023",
            createdUnix: 1698111600,
            author: "Sarah Jenkins",
            status: "published",
            languages: ["EN", "JP"]
        },
        {
            id: 2,
            title: language === 'ja' ? "ハマギクスター" : "Hamagiku Star",
            created: "Oct 22, 2023",
            createdUnix: 1697938800,
            author: "Kenji Sato",
            status: "draft",
            languages: ["JP"]
        },
        {
            id: 3,
            title: language === 'ja' ? "グリーンフォレスト" : "Green Forest",
            created: "Oct 15, 2023",
            createdUnix: 1697334000,
            author: "Eleanor Pena",
            status: "review",
            languages: ["EN"]
        },
        {
            id: 4,
            title: language === 'ja' ? "ハマギクプライド" : "Hamagiku Pride",
            created: "Oct 10, 2023",
            createdUnix: 1696902000,
            author: "Sarah Jenkins",
            status: "published",
            languages: ["EN"]
        },
        {
            id: 5,
            title: language === 'ja' ? "オータムリーフ" : "Autumn Leaf",
            created: "Oct 05, 2023",
            createdUnix: 1696470000,
            author: "Pierre Dubois",
            status: "draft",
            languages: ["FR", "EN"]
        }
    ];

    const toggleLanguage = () => {
        setLanguage(language === 'ja' ? 'en' : 'ja');
    };

    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-stone-850 dark:text-gray-100 font-sans antialiased overflow-hidden">
            <aside className="w-20 lg:w-64 flex flex-col justify-between border-r border-stone-200 dark:border-stone-800 bg-[#F5F4F0] dark:bg-stone-900/50 backdrop-blur-sm transition-all duration-300">
                <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8">
                    <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-xl">spa</span>
                    </div>
                    <span className="hidden lg:block ml-3 font-display font-bold text-xl tracking-tight text-primary-dark dark:text-white">Hamagiku Farm</span>
                </div>
                <nav className="flex-1 px-4 flex flex-col gap-2 py-4">
                    <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white dark:hover:bg-primary/10 transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="#">
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">dashboard</span>
                        <span className="hidden lg:block text-sm font-medium">{t('dashboard')}</span>
                    </a>
                    <a className="group flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20" href="#">
                        <span className="material-symbols-outlined fill-1">article</span>
                        <span className="hidden lg:block text-sm font-medium">{t('reportInventory')}</span>
                    </a>
                    <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white dark:hover:bg-primary/10 transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="#">
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">group</span>
                        <span className="hidden lg:block text-sm font-medium">{t('clients')}</span>
                    </a>
                    <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white dark:hover:bg-primary/10 transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="#">
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">settings</span>
                        <span className="hidden lg:block text-sm font-medium">{t('settings')}</span>
                    </a>
                </nav>
                <div className="p-4 mt-auto">
                    <div
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-stone-800 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
                        onClick={toggleLanguage}
                        title="Toggle Language"
                    >
                        <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 shrink-0 shadow-sm bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {language.toUpperCase()}
                        </div>
                        <div className="hidden lg:flex flex-col overflow-hidden">
                            <h1 className="text-stone-900 dark:text-white text-sm font-semibold truncate">Eleanor Pena</h1>
                            <p className="text-stone-500 dark:text-stone-400 text-xs truncate">Senior Editor</p>
                        </div>
                    </div>
                </div>
            </aside>
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background-light dark:from-background-dark to-transparent pointer-events-none z-10"></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-[1200px] mx-auto w-full p-6 lg:p-12 pb-24">
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 relative z-20">
                            <div className="flex flex-col gap-2 max-w-2xl">
                                <span className="text-primary font-medium text-sm uppercase tracking-wider mb-1">{t('deliverables')}</span>
                                <h1 className="text-stone-900 dark:text-white text-4xl lg:text-5xl font-display font-medium leading-tight">
                                    {t('reportInventory')}
                                </h1>
                                <p className="text-stone-500 dark:text-stone-400 text-lg font-light mt-2 max-w-lg">
                                    {t('manageReportsDesc')}
                                </p>
                            </div>
                            <button className="flex items-center justify-center gap-2 bg-primary dark:bg-white text-white dark:text-stone-900 hover:bg-primary-dark dark:hover:bg-gray-200 transition-all duration-300 px-6 py-3 rounded-full shadow-lg hover:shadow-primary/30 group">
                                <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">add</span>
                                <span className="text-sm font-bold tracking-wide">{t('createReportBtn')}</span>
                            </button>
                        </header>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md py-4 z-30 transition-all border-b border-stone-200/50 dark:border-stone-800/50">
                            <div className="relative w-full md:max-w-md group">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-stone-400 group-focus-within:text-primary transition-colors">
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="block w-full p-3 pl-10 text-sm text-stone-900 dark:text-white bg-transparent border-b border-stone-300 dark:border-stone-700 focus:border-primary dark:focus:border-primary focus:ring-0 placeholder-stone-400 transition-colors rounded-none" placeholder={t('searchPlaceholder')} type="text" />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full hover:border-primary hover:text-primary transition-all shadow-sm">
                                        <span>{t('statusAll')}</span>
                                        <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
                                    </button>
                                </div>
                                <div className="relative group">
                                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full hover:border-primary hover:text-primary transition-all shadow-sm">
                                        <span>{t('languageAll')}</span>
                                        <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
                                    </button>
                                </div>
                                <button className="p-2 text-stone-400 hover:text-primary transition-colors ml-2" title="Filter Settings">
                                    <span className="material-symbols-outlined">tune</span>
                                </button>
                            </div>
                        </div>
                        <div className="w-full">
                            <div className="overflow-hidden rounded-xl bg-white dark:bg-stone-900 shadow-sm border border-stone-100 dark:border-stone-800">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-stone-100 dark:border-stone-800 text-xs uppercase tracking-wider text-stone-400 font-medium bg-[#FBFBF9] dark:bg-stone-900">
                                            <th className="px-6 py-5 font-medium w-[40%]">{t('reportTitle')}</th>
                                            <th className="px-6 py-5 font-medium hidden sm:table-cell">{t('created')}</th>
                                            <th className="px-6 py-5 font-medium">{t('status')}</th>
                                            <th className="px-6 py-5 font-medium hidden md:table-cell">{t('language')}</th>
                                            <th className="px-6 py-5 font-medium text-right">{t('action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                        {reports.map((report) => (
                                            <tr key={report.id} className="group hover:bg-primary/5 transition-colors duration-200 cursor-pointer">
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xl font-display font-medium text-stone-900 dark:text-white group-hover:text-primary transition-colors">{report.title}</span>
                                                        <span className="text-xs text-stone-400 mt-1 sm:hidden">
                                                            {report.created} • {report.languages.join('/')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-sm text-stone-500 hidden sm:table-cell">
                                                    {report.created}
                                                    <div className="text-xs text-stone-400 mt-0.5">by {report.author}</div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    {report.status === 'published' && (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light text-xs font-semibold border border-primary/20 dark:border-primary/30">
                                                            <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                                                            {t('published')}
                                                        </div>
                                                    )}
                                                    {report.status === 'draft' && (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs font-semibold border border-stone-200 dark:border-stone-700">
                                                            {t('draft')}
                                                        </div>
                                                    )}
                                                    {report.status === 'review' && (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold border border-orange-100 dark:border-orange-800">
                                                            <span className="size-1.5 rounded-full bg-orange-400"></span>
                                                            {t('review')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6 hidden md:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        {report.languages.map(lang => (
                                                            <span key={lang} className="px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs rounded border border-stone-200 dark:border-stone-700 font-medium">
                                                                {lang}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <button className="text-stone-400 hover:text-primary p-2 rounded-full hover:bg-white dark:hover:bg-stone-800 transition-all opacity-0 group-hover:opacity-100">
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900">
                                    <div className="text-xs text-stone-400">{t('showingReports')}</div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-1 rounded-md hover:bg-white dark:hover:bg-stone-800 hover:text-primary text-stone-400 transition-colors disabled:opacity-50">
                                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                                        </button>
                                        <button className="p-1 rounded-md hover:bg-white dark:hover:bg-stone-800 hover:text-primary text-stone-400 transition-colors">
                                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
