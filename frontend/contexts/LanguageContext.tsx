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
    trainers: { ja: "調教師一覧", en: "Trainers" },
    weights: { ja: "体重管理", en: "Weight Management" },

    // Dashboard Header
    deliverables: { ja: "Deliverables", en: "Deliverables" }, // Kept as English in JP design
    manageReportsDesc: { ja: "多言語レポートの作成と管理をここで行えます。", en: "Manage and track your multilingual client deliverables across all regions." },
    createReportBtn: { ja: "月次レポート作成", en: "Create Monthly Report" },
    createMonthlyReport: { ja: "月次レポート作成", en: "Create Monthly Report" },
    pendingReviewLabel: { ja: "レビュー待ち", en: "Pending Review" },
    draftReportsLabel: { ja: "下書き", en: "Draft" },
    approvedReportsLabel: { ja: "承認済み", en: "Approved" },

    // Filters
    searchPlaceholder: { ja: "馬名またはIDで検索", en: "Search by horse name or ID..." },
    statusAll: { ja: "ステータス: すべて", en: "Status: All" },
    languageAll: { ja: "言語: すべて", en: "Language: All" },

    // Table Headers
    reportTitle: { ja: "レポート名", en: "Report Title" },
    date: { ja: "日付", en: "Date" },
    created: { ja: "作成日", en: "Created" },
    status: { ja: "ステータス", en: "Status" },
    language: { ja: "言語", en: "Language" },
    action: { ja: "操作", en: "Action" },

    // Table Statuses
    published: { ja: "承認済み", en: "Published" },
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
    birthDate: { ja: "生年月日", en: "Birth Date" },
    weight: { ja: "体重", en: "Weight" },
    comment: { ja: "コメント", en: "Comment" },
    reportOutputMode: { ja: "レポート出力形式", en: "Report Output Mode" },
    reportOutputPdf: { ja: "PDF", en: "PDF" },
    reportOutputPrint: { ja: "印刷", en: "Print" },

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
    measurementDate: { ja: "測定日", en: "Measurement Date" },
    latestWeight: { ja: "最新体重", en: "Latest Weight" },
    inputWeight: { ja: "入力体重", en: "Input Weight" },
    saveWeights: { ja: "保存", en: "Save" },
    savingWeights: { ja: "保存中...", en: "Saving..." },
    noActiveHorses: { ja: "アクティブな馬がいません", en: "No active horses" },

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
    addTrainer: { ja: "調教師追加", en: "Add Trainer" },
    editTrainer: { ja: "編集", en: "Edit" },

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

    // Horse Detail & Transfer
    ownerTransfer: { ja: "所有者変更 (譲渡)", en: "Owner (Transfer)" },
    searchOwnerPlaceholder: { ja: "所有者を検索または新規作成...", en: "Search or create new owner..." },
    newOwnerWillBeCreated: { ja: "新しい所有者が作成されます: ", en: "New owner will be created: " },
    noOwner: { ja: "所有者なし", en: "No Owner" },
    trainer: { ja: "調教師", en: "Trainer" },
    trainerNameJp: { ja: "調教師名 (日本語)", en: "Trainer Name (JP)" },
    trainerNameEn: { ja: "調教師名 (英語)", en: "Trainer Name (EN)" },
    trainerLocation: { ja: "所属・場所", en: "Base / Location" },
    trainerSelectPlaceholder: { ja: "調教師を選択...", en: "Select a trainer..." },
    newTrainerWillBeCreated: { ja: "新しい調教師が作成されます: ", en: "New trainer will be created: " },
    noTrainer: { ja: "調教師なし", en: "No Trainer" },
    addNewTrainer: { ja: "新しい調教師を追加", en: "Add new trainer" },
    useExistingTrainer: { ja: "既存の調教師を使う", en: "Use existing trainer" },
    editProfile: { ja: "プロフィール編集", en: "Edit Profile" },
    horseNameJp: { ja: "馬名 (日本語)", en: "Horse Name (JP)" },
    horseNameEn: { ja: "馬名 (英語)", en: "Horse Name (EN)" },
    sireJp: { ja: "父 (日本語)", en: "Sire (JP)" },
    sireEn: { ja: "父 (英語)", en: "Sire (EN)" },
    damJp: { ja: "母 (日本語)", en: "Dam (JP)" },
    damEn: { ja: "母 (英語)", en: "Dam (EN)" },
    owner: { ja: "馬主", en: "Owner" },
    deleteReport: { ja: "レポート削除", en: "Delete Report" },
    confirmDeleteReport: { ja: "本当にこのレポートを削除しますか？\nこの操作は取り消せません。", en: "Are you sure you want to delete this report?\nThis action cannot be undone." },
    deleteSuccess: { ja: "レポートを削除しました", en: "Report deleted successfully" },
    deleteError: { ja: "削除に失敗しました: ", en: "Failed to delete: " },
    sortByName: { ja: "並び替え: 馬名", en: "Sort: Name" },
    sortByTrainer: { ja: "並び替え: 調教師", en: "Sort: Trainer" },
    horseStatusLabel: { ja: "ステータス", en: "Status" },
    horseStatusActive: { ja: "在厩中", en: "Active" },
    horseStatusResting: { ja: "休養中", en: "Resting" },
    horseStatusInjured: { ja: "怪我", en: "Injured" },
    horseStatusRetired: { ja: "退厩", en: "Departed" },
    horseStatusSold: { ja: "売却", en: "Sold" },
    horseStatusOther: { ja: "その他", en: "Other" },
    activeHorsesLabel: { ja: "在厩馬", en: "Active Horses" },
    retiredHorsesLabel: { ja: "退厩馬", en: "Departed Horses" },
    horseListFilterLabel: { ja: "表示", en: "Show" },
    showActiveOnly: { ja: "在厩馬のみ", en: "Active only" },
    showRetiredOnly: { ja: "退厩馬のみ", en: "Departed only" },
    departureDate: { ja: "退厩日", en: "Departure Date" },
    lastFarrier: { ja: "最終装蹄", en: "Farrier" },
    lastWorming: { ja: "最終駆虫", en: "Recent Worming" },
    feeding: { ja: "飼葉内容", en: "Feeding" },
    exercise: { ja: "調教内容", en: "Exercise Routine" },
    sexAge: { ja: "性別・年齢", en: "Sex / Age" },
    departureReport: { ja: "退厩レポート", en: "Departure Report" },
    createDepartureReport: { ja: "退厩レポート作成", en: "Create Departure Report" },
    weightDate: { ja: "体重測定日", en: "Weight Date" },
    sex: { ja: "性別", en: "Sex" },

    // Statuses
    status_Draft: { ja: "下書き", en: "Draft" },
    status_Training: { ja: "調教中", en: "Training" },
    status_Resting: { ja: "休養中", en: "Resting" },
    status_Spelling: { ja: "放牧中", en: "Spelling" },
    status_Approved: { ja: "承認済み", en: "Published" },
    status_InReview: { ja: "レビュー中", en: "In Review" },
    status_Unknown: { ja: "不明", en: "Unknown" },
    sun: { ja: "日", en: "Sun" },
    mon: { ja: "月", en: "Mon" },
    tue: { ja: "火", en: "Tue" },
    wed: { ja: "水", en: "Wed" },
    thu: { ja: "木", en: "Thu" },
    fri: { ja: "金", en: "Fri" },
    sat: { ja: "土", en: "Sat" },

    // Repro Management
    reproManagement: { ja: "繁殖管理", en: "Repro Management" },
    reproToday: { ja: "今日の繁殖管理", en: "Repro Today" },
    reproSubtitle: { ja: "繁殖牝馬の検査状況", en: "Breeding mare check status" },
    reproMares: { ja: "繁殖牝馬", en: "Mares" },
    reproLastCheck: { ja: "最終検査", en: "Last Check" },
    reproNoData: { ja: "データなし", en: "No data" },
    reproTimeline: { ja: "タイムライン", en: "Timeline" },
    reproNewCheck: { ja: "新規検査", en: "New Check" },
    reproBack: { ja: "戻る", en: "Back" },
    reproNotifications: { ja: "フォロー通知", en: "Notifications" },
    reproItems: { ja: "件", en: "items" },
    reproStartCheck: { ja: "検査開始", en: "Start Check" },
    reproNotificationsEmpty: { ja: "通知はありません", en: "No notifications" },
    reproCalendar: { ja: "カレンダー", en: "Calendar" },
    reproPrevMonth: { ja: "前月", en: "Previous month" },
    reproNextMonth: { ja: "翌月", en: "Next month" },
    reproChecks: { ja: "検査", en: "Checks" },
    reproNoEventsDay: { ja: "この日の検査はありません", en: "No checks for this day" },
    reproSearch: { ja: "検索", en: "Search" },
    reproDirectory: { ja: "牝馬一覧", en: "Mare Directory" },
    reproMareId: { ja: "馬ID", en: "Mare ID" },
    reproDetails: { ja: "詳細", en: "Details" },
    reproClose: { ja: "閉じる", en: "Close" },
    reproPerformedAt: { ja: "検査日時", en: "Performed At" },
    reproAm: { ja: "午前", en: "AM" },
    reproPm: { ja: "午後", en: "PM" },
    reproNow: { ja: "今", en: "Now" },
    reproOvary: { ja: "卵巣", en: "Ovary" },
    reproUterus: { ja: "子宮", en: "Uterus" },
    reproCervix: { ja: "子宮頸管", en: "Cervix" },
    reproPalpation: { ja: "触感", en: "Feel" },
    reproInterventions: { ja: "処置", en: "Interventions" },
    reproNote: { ja: "備考", en: "Note" },
    reproFollowBanner: { ja: "フォロー対象", en: "Follow-up" },
    reproSettings: { ja: "繁殖設定", en: "Repro Settings" },
    broodmareFlag: { ja: "繁殖候補 (Filly)", en: "Broodmare (Filly)" },
    coverDate: { ja: "種付け日", en: "Cover Date" },
    stallionName: { ja: "種牡馬名", en: "Stallion" },
    scanSchedule: { ja: "検査予定", en: "Scan Schedule" },
    scanResult: { ja: "結果", en: "Result" },
    scanActualDate: { ja: "実施日", en: "Actual Date" },
    addCover: { ja: "種付け追加", en: "Add Cover" },
    ruleDaysAfter: { ja: "日数（カンマ区切り）", en: "Days After (comma)" },
    saveRule: { ja: "設定保存", en: "Save Rule" },
    latestUpdates: { ja: "最新更新", en: "Latest Updates" },
    latestReproCheck: { ja: "最新繁殖チェック", en: "Latest Repro Check" },
    latestCover: { ja: "最新種付け", en: "Latest Cover" },
    latestScan: { ja: "最新スキャン", en: "Latest Scan" },
    openReproCalendar: { ja: "繁殖カレンダー", en: "Repro Calendar" },
    openReproList: { ja: "繁殖一覧", en: "Repro List" },
    openReproNotifications: { ja: "繁殖通知", en: "Repro Notifications" },
    todaySchedule: { ja: "今日の予定", en: "Today Schedule" },
    calendar: { ja: "カレンダー", en: "Calendar" },
    memoEvent: { ja: "メモ予定", en: "Memo Event" },
    addMemo: { ja: "予定追加", en: "Add Event" },
    memoDate: { ja: "日付", en: "Date" },
    memoTitle: { ja: "タイトル", en: "Title" },
    memoNote: { ja: "メモ", en: "Note" },
    memoTitlePlaceholder: { ja: "例: 診療立ち会い", en: "e.g. vet appointment" },
    memoNotePlaceholder: { ja: "自由入力", en: "Free note" },
    memoSaveError: { ja: "予定の保存に失敗しました: ", en: "Failed to save event: " },
    noEventsToday: { ja: "本日の予定はありません", en: "No events today" },
    scrollHorizontal: { ja: "左右にスクロール", en: "Scroll sideways" },
    memoEdit: { ja: "修正", en: "Edit" },
    memoDelete: { ja: "削除", en: "Delete" },
    memoUpdate: { ja: "更新", en: "Update" },
    memoCancel: { ja: "キャンセル", en: "Cancel" },
    memoEmpty: { ja: "この日のメモ予定はありません", en: "No memo events for this day" },
    memoDeleteConfirm: { ja: "この予定を削除しますか？", en: "Delete this event?" },
    memoDeleteError: { ja: "予定の削除に失敗しました: ", en: "Failed to delete event: " },
    manualCheck: { ja: "個別チェック追加", en: "Add Manual Check" },
    addScan: { ja: "チェック追加", en: "Add Check" },
    selectCover: { ja: "種付けを選択", en: "Select cover" },
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
