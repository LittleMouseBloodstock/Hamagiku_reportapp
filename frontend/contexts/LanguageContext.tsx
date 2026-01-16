'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ja' | 'en';

interface Translations {
    [key: string]: {
        ja: string;
        en: string;
    };
}

const translations: Translations = {
    // Dashboard
    dashboardTitle: { ja: "レポート管理ダッシュボード", en: "Report Management Dashboard" },
    newReport: { ja: "新規レポート作成", en: "Create New Report" },
    searchPlaceholder: { ja: "馬名で検索...", en: "Search by horse name..." },
    loading: { ja: "読み込み中...", en: "Loading..." },

    // Columns
    horseName: { ja: "馬名", en: "Horse Name" },
    reportCount: { ja: "レポート数", en: "Reports" },
    lastUpdate: { ja: "最終更新", en: "Last Update" },
    actions: { ja: "操作", en: "Actions" },

    // Actions
    view: { ja: "詳細", en: "View" },
    create: { ja: "作成", en: "Create" },

    // Horse Detail
    backToDashboard: { ja: "ダッシュボードに戻る", en: "Back to Dashboard" },
    reportsList: { ja: "レポート一覧", en: "Reports List" },
    createNewReport: { ja: "この馬のレポートを作成", en: "Create Report" },

    // Editor / Report
    editReport: { ja: "レポート編集", en: "Edit Report" },
    save: { ja: "保存", en: "Save" },
    print: { ja: "印刷 (PDF)", en: "Print (PDF)" },

    // Report Fields
    sire: { ja: "父", en: "Sire" },
    dam: { ja: "母", en: "Dam" },
    age: { ja: "年齢", en: "Age" },
    weight: { ja: "体重", en: "Weight" },
    status: { ja: "現況", en: "Status" },
    comment: { ja: "コメント", en: "Comment" },
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('ja');

    const t = (key: string) => {
        const entry = translations[key];
        if (!entry) return key;
        return entry[language];
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
