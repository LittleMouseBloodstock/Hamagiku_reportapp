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
    reportInventory: { ja: "レポート一覧", en: "Report Inventory" },
    dashboard: { ja: "ダッシュボード", en: "Dashboard" },
    clients: { ja: "クライアント一覧", en: "Clients" },
    horses: { ja: "馬一覧", en: "Horses" },
    settings: { ja: "設定", en: "Settings" },

    // Dashboard Header
    deliverables: { ja: "Deliverables", en: "Deliverables" }, // Kept as English in JP design
    manageReportsDesc: { ja: "多言語レポートの作成と管理をここで行えます。", en: "Manage and track your multilingual client deliverables across all regions." },
    createReportBtn: { ja: "レポート作成", en: "Create Report" },

    // Filters
    searchPlaceholder: { ja: "馬名またはIDで検索", en: "Search by horse name or ID..." },
    statusAll: { ja: "ステータス: すべて", en: "Status: All" },
    languageAll: { ja: "言語: すべて", en: "Language: All" },

    // Table Headers
    reportTitle: { ja: "レポート名", en: "Report Title" },
    created: { ja: "作成日", en: "Created" },
    status: { ja: "ステータス", en: "Status" },
    language: { ja: "言語", en: "Language" },
    action: { ja: "操作", en: "Action" },

    // Table Statuses
    published: { ja: "公開済み", en: "Published" },
    draft: { ja: "下書き", en: "Draft" },
    review: { ja: "レビュー中", en: "Review" },

    // Pagination
    showingReports: { ja: "全24件中 1-5件を表示", en: "Showing 1-5 of 24 reports" },

    newReport: { ja: "新規レポート作成", en: "Create New Report" },
    recentReports: { ja: "最近のレポート", en: "Recent Reports" },
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
    comment: { ja: "コメント", en: "Comment" },

    // Report Builder Sidebar
    basicInfo: { ja: "基本情報", en: "Basic Info" },
    reportDate: { ja: "レポート年月", en: "Report Date" },
    photo: { ja: "写真", en: "Photo" },
    selectImage: { ja: "画像を選択", en: "Select Image" },
    uploadNewPhoto: { ja: "新しい写真をアップロード", en: "Upload New Photo" },
    statusStats: { ja: "ステータス・統計", en: "Status & Stats" },
    currentWeight: { ja: "現在の体重", en: "Current Weight" },
    training: { ja: "調教状況", en: "Training" },
    condition: { ja: "体調", en: "Condition" },
    target: { ja: "目標", en: "Target" },
    weightHistory: { ja: "体重推移", en: "Weight History" },
    aiComments: { ja: "AIコメント生成", en: "AI Comments" },
    englishComment: { ja: "英語コメント", en: "English Comment" },
    japaneseTranslation: { ja: "日本語翻訳", en: "Japanese Translation" },

    // Client Form
    clientBasicInfo: { ja: "基本情報", en: "Basic Information" },
    clientName: { ja: "クライアント名 / 会社名", en: "Client Name / Company Name" },
    representativeName: { ja: "代表者名", en: "Representative Name" },
    contactInfo: { ja: "連絡先情報", en: "Contact Information" },
    email: { ja: "メールアドレス", en: "Email" },
    phone: { ja: "電話番号", en: "Phone" },
    address: { ja: "住所", en: "Address" },
    zipCode: { ja: "郵便番号", en: "Zip Code" },
    prefecture: { ja: "都道府県", en: "Prefecture" },
    city: { ja: "市区町村", en: "City" },
    street: { ja: "番地・建物名", en: "Street / Building" },
    notes: { ja: "備考", en: "Notes" },
    cancel: { ja: "キャンセル", en: "Cancel" },
    saveChanges: { ja: "変更を保存", en: "Save Changes" },
    createClient: { ja: "クライアント登録", en: "Create Client" },
    saving: { ja: "保存中...", en: "Saving..." },
    editClient: { ja: "クライアント編集", en: "Edit Client" },
    newClient: { ja: "新規クライアント登録", en: "New Client" },
    addClient: { ja: "クライアント追加", en: "Add Client" },
    addHorse: { ja: "馬を追加", en: "Add Horse" },

    // Report Preview Labels
    trainersComment: { ja: "コメント", en: "COMMENT" },
    monthlyReport: { ja: "月次レポート", en: "MONTHLY REPORT" },
    // User Management Settings
    settingsTitle: { ja: "設定", en: "Settings" },
    settingsDesc: { ja: "アプリケーションのアクセス権限と設定を管理します。", en: "Manage application access and configuration." },
    userManagement: { ja: "ユーザー管理", en: "User Management" },
    userManagementDesc: { ja: "このアプリケーションにアクセスできるユーザーを制御します。", en: "Control who can access this application." },
    addNewEmail: { ja: "新しいメールアドレスを追加", en: "Add New Email" },
    addUser: { ja: "ユーザー追加", en: "Add User" },
    adding: { ja: "追加中...", en: "Adding..." },
    allowedUsers: { ja: "許可されたユーザー", en: "Allowed Users" },
    noUsersFound: { ja: "ユーザーが見つかりません。", en: "No users found." },
    confirmRemoveUser: { ja: "{email} を削除してもよろしいですか？このユーザーはログインできなくなります。", en: "Are you sure you want to remove {email}? They will no longer be able to login." },
    userAdded: { ja: "ユーザーを追加しました", en: "User added successfully" },
    userRemoved: { ja: "ユーザーを削除しました", en: "User removed successfully" },
    errorAdding: { ja: "ユーザー追加エラー: ", en: "Error adding user: " },
    errorDeleting: { ja: "ユーザー削除エラー: ", en: "Error deleting user: " },
    failedLoadUsers: { ja: "ユーザー一覧の読み込みに失敗しました: ", en: "Failed to load users: " },
    loadingUsers: { ja: "ユーザー読み込み中...", en: "Loading users..." },
    adminRole: { ja: "管理者", en: "Admin" },
    removeAccess: { ja: "アクセス権を削除", en: "Remove Access" },
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
