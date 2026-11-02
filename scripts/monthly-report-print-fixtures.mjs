import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { copyFile, access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// ReportTemplateを認証・通信から切り離し、同じ入力を毎回静的HTMLへ描画する。
// このスクリプトは検証用の一時ディレクトリだけへ出力し、本番データを読み書きしない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const requireFrontend = createRequire(path.join(frontend, 'package.json'));
const { build } = requireFrontend('esbuild');
const label = process.argv.find((value) => value.startsWith('--label='))?.slice(8) || 'current';
assert.match(label, /^[a-z0-9-]+$/);
const only = process.argv.find((value) => value.startsWith('--case='))?.slice(7);
if (only) assert.match(only, /^[a-z0-9-]+$/);
// 修正前の同一入力を再生成し、回帰検査が失敗することも確認できる。
const sourceRef = process.argv.find(value => value.startsWith('--source-ref='))?.slice(13);
const buildRoot = path.resolve(process.argv.find(value => value.startsWith('--build-root='))?.slice(13) || path.join(frontend, '.next'));
const readSource = relative => sourceRef
    ? Promise.resolve(execFileSync('git', ['show', `${sourceRef}:${relative}`], { cwd: root, encoding: 'utf8' }))
    : readFile(path.join(root, relative), 'utf8');

const directory = path.join(root, 'tmp/monthly-report-print-audit', label);
const assetsDirectory = path.join(directory, 'assets');
await mkdir(assetsDirectory, { recursive: true });

function assertCssContract(source, selector, expectedDeclarations, labelText) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`));
    assert.ok(match, `${labelText}のCSSルールが見つかりません: ${selector}`);
    for (const declaration of expectedDeclarations) {
        assert.match(match[1], declaration, `${labelText}の寸法契約が変わりました: ${declaration}`);
    }
}

// 実運用の単票・一括印刷経路が、fixtureの前提から外れた場合は生成自体を止める。
const reportTemplateSource = await readSource('frontend/components/ReportTemplate.tsx');
for (const contract of [
    /batchPrint\?: boolean/,
    /<Fonts disablePrintStyles=\{batchPrint\}/,
    /height: hasAppendix \|\| batchPrint \? undefined : '297mm'/,
    /className=\{`data-section flex shrink-0/,
    /h-\[120px\] min-h-\[120px\]/,
    /h-\[115px\] min-h-\[115px\]/,
]) assert.match(reportTemplateSource, contract, `ReportTemplate契約が変わりました: ${contract}`);
assertCssContract(
    reportTemplateSource,
    'body:not(.batch-print) #report-preview.print-mode .data-section',
    [/(?:^|;)\s*height:\s*120px\s*!important/, /(?:^|;)\s*min-height:\s*120px\s*!important/, /(?:^|;)\s*flex-shrink:\s*0\s*!important/],
    '単票・ロゴ付き',
);
assertCssContract(
    reportTemplateSource,
    'body:not(.batch-print) #report-preview.print-mode.no-logo .data-section',
    [/(?:^|;)\s*height:\s*115px\s*!important/, /(?:^|;)\s*min-height:\s*115px\s*!important/, /(?:^|;)\s*flex-shrink:\s*0\s*!important/],
    '単票・ロゴなし',
);
const batchReportsSource = await readSource('frontend/app/dashboard/clients/[id]/reports/page.tsx');
for (const contract of [
    /batchPrint=\{true\}/,
    /page-break-after-always/,
    /\.batch-report-page \.report-preview\.print-mode \.comment-box/,
]) assert.match(batchReportsSource, contract, `一括印刷CSS契約が変わりました: ${contract}`);
assertCssContract(
    batchReportsSource,
    '.batch-report-page .report-preview.print-mode .data-section',
    [/(?:^|;)\s*height:\s*120px\s*!important/, /(?:^|;)\s*min-height:\s*120px\s*!important/, /(?:^|;)\s*flex-shrink:\s*0\s*!important/],
    '一括・ロゴ付き',
);
assertCssContract(
    batchReportsSource,
    '.batch-report-page .report-preview.print-mode.no-logo .data-section',
    [/(?:^|;)\s*height:\s*115px\s*!important/, /(?:^|;)\s*min-height:\s*115px\s*!important/, /(?:^|;)\s*flex-shrink:\s*0\s*!important/],
    '一括・ロゴなし',
);
const batchStyleMatch = batchReportsSource.match(/<style jsx global>\{`([\s\S]*?)`\}<\/style>/);
assert.ok(batchStyleMatch, '一括印刷CSSの実装本体を取得できません');
// 一括印刷fixtureにも実運用のCSSを適用し、source側のnowrap変更を回帰検知する。
const batchPrintCss = batchStyleMatch[1];

const bundle = path.join(directory, 'fixture.cjs');
await build({
    absWorkingDir: frontend,
    tsconfig: path.join(root, 'scripts/monthly-report-print.tsconfig.json'),
    stdin: {
        contents: `
            import React from 'react';
            import { renderToStaticMarkup } from 'react-dom/server';
            import ReportTemplate from '@/components/ReportTemplate';
            import { setAuditLanguage } from '@/contexts/LanguageContext';
            export function renderReport(language, data, batchPrint = false) {
                setAuditLanguage(language);
                return renderToStaticMarkup(<ReportTemplate initialData={data} readOnly batchPrint={batchPrint} />);
            }
        `,
        resolveDir: frontend,
        sourcefile: 'monthly-report-print-audit.tsx',
        loader: 'tsx',
    },
    bundle: true,
    jsx: 'transform',
    define: { 'process.env.NODE_ENV': '"production"' },
    platform: 'node',
    format: 'cjs',
    outfile: bundle,
    plugins: [{
        name: 'isolated-monthly-print-fixture',
        setup(builder) {
            // このワークツリーではesbuild旧版のnode_modules探索が上位の仮想パスへ
            // 逸脱するため、実行に必要な既存依存だけを絶対パスで固定する。
            builder.onResolve({ filter: /^react$/ }, () => ({ path: path.join(frontend, 'node_modules/react/index.js'), external: true }));
            builder.onResolve({ filter: /^react-dom\/server$/ }, () => ({ path: path.join(frontend, 'node_modules/react-dom/server.node.js'), external: true }));
            builder.onResolve({ filter: /^lucide-react$/ }, () => ({ path: path.join(frontend, 'node_modules/lucide-react/dist/cjs/lucide-react.js'), external: true }));
            builder.onResolve({ filter: /^@\/components\/ReportTemplate$/ }, () => ({ path: path.join(frontend, 'components/ReportTemplate.tsx') }));
            builder.onResolve({ filter: /^@\/contexts\/LanguageContext$/ }, () => ({ path: 'language', namespace: 'monthly-audit' }));
            // ReportTemplate imports this context relatively; keep that import equally isolated.
            builder.onResolve({ filter: /[\\/]contexts[\\/]LanguageContext$/ }, () => ({ path: 'language', namespace: 'monthly-audit' }));
            builder.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: 'api', namespace: 'monthly-audit' }));
            builder.onResolve({ filter: /^@\/lib\/careRecords$/ }, () => ({ path: 'care-records', namespace: 'monthly-audit' }));
            builder.onResolve({ filter: /^@\/lib\/care-record-features$/ }, () => ({ path: 'care-record-features', namespace: 'monthly-audit' }));
            builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: 'next-image', namespace: 'monthly-audit' }));
            builder.onResolve({ filter: /^react-easy-crop$/ }, () => ({ path: 'cropper', namespace: 'monthly-audit' }));
            builder.onLoad({ filter: /[\\/]components[\\/]ReportTemplate\.tsx$/ }, async ({ path: filename }) => {
                const source = reportTemplateSource;
                assert.equal(source.match(/<style jsx global>/g)?.length, 1, '印刷CSSのstyle要素数が変わりました');
                return {
                    contents: source.replace(
                        /<style jsx global>\{([\s\S]+?)\}<\/style>/g,
                        '<style dangerouslySetInnerHTML={{ __html: $1 }} />',
                    ),
                    loader: 'tsx',
                    resolveDir: path.dirname(filename),
                };
            });
            builder.onLoad({ filter: /.*/, namespace: 'monthly-audit' }, ({ path: name }) => {
                const contents = {
                    language: `
                        let language = 'ja';
                        const translations = {
                            monthlyReport: { ja: '月次レポート', en: 'MONTHLY REPORT' },
                            weightHistory: { ja: '体重推移', en: 'Weight History' },
                            currentWeight: { ja: '現在の体重', en: 'Current Weight' },
                            training: { ja: '調教状況', en: 'Training' },
                            condition: { ja: '体調', en: 'Condition' },
                            trainersComment: { ja: 'コメント', en: 'COMMENT' },
                            owner: { ja: '馬主', en: 'Owner' },
                            trainer: { ja: '調教師', en: 'Trainer' },
                            birthDate: { ja: '生年月日', en: 'Birth Date' },
                            sexAge: { ja: '性別・年齢', en: 'Sex / Age' },
                            sire: { ja: '父', en: 'Sire' },
                            dam: { ja: '母', en: 'Dam' },
                            horseName: { ja: '馬名', en: 'Horse Name' },
                            reportDate: { ja: 'レポート年月', en: 'Report Date' },
                            basicInfo: { ja: '基本情報', en: 'Basic Info' },
                            photo: { ja: '写真', en: 'Photo' },
                            selectImage: { ja: '画像を選択', en: 'Select Image' },
                            statusStats: { ja: 'ステータス・統計', en: 'Status & Stats' },
                            aiComments: { ja: 'AIコメント生成', en: 'AI Comments' },
                            englishComment: { ja: '英語コメント', en: 'English Comment' },
                            japaneseTranslation: { ja: '日本語翻訳', en: 'Japanese Translation' },
                        };
                        export function setAuditLanguage(value) { language = value; }
                        export function useLanguage() { return { language, setLanguage: setAuditLanguage, t: key => translations[key]?.[language] || key }; }
                    `,
                    api: `export async function getApiAuthHeaders() { throw new Error('静的検証中の通信は禁止です'); }
                             export async function translateText() { throw new Error('静的検証中の翻訳通信は禁止です'); }`,
                    'care-records': `export function getCareRecordNote() { return ''; }
                                     export function paginateCareRecords() { return []; }`,
                    'care-record-features': `export const CARE_RECORD_REPORT_LINKING_ENABLED = false;`,
                    'next-image': `import React from 'react';
                                   export default function Image({ fill: _fill, unoptimized: _unoptimized, priority: _priority, ...props }) { return React.createElement('img', props); }`,
                    cropper: `import React from 'react';
                              export default function Cropper(props) { return React.createElement('div', props); }`,
                }[name];
                assert.ok(contents, `不明な検証用スタブ: ${name}`);
                return { contents, loader: name === 'next-image' || name === 'cropper' ? 'jsx' : 'js', resolveDir: frontend };
            });
        },
    }],
});
const { renderReport } = requireFrontend(bundle);

const cssDirectory = path.join(buildRoot, 'static/css');
const cssFiles = (await readdir(cssDirectory)).filter((name) => name.endsWith('.css')).sort();
assert.ok(cssFiles.length, '先にfrontendの本番ビルドを行ってください');
const fontFiles = new Set();
const styles = await Promise.all(cssFiles.map(async (name) => {
    const source = await readFile(path.join(cssDirectory, name), 'utf8');
    return source
        .replace(/@import[^;]*fonts\.googleapis\.com[^;]*;/g, '')
        .replace(/url\((['"]?)((?:\.\.\/media\/|\/_next\/static\/media\/)[^)'"\s]+)\1\)/g,
            (_, quote, relative) => {
                const filename = relative.startsWith('/_next/')
                    ? path.join(buildRoot, relative.slice('/_next/'.length))
                    : path.resolve(cssDirectory, relative);
                fontFiles.add(filename);
                return `url("./assets/${path.basename(filename)}")`;
            });
}));
const commonCss = styles.join('\n');
assert.ok(fontFiles.size, '本番フォントのローカル参照が必要です');
await Promise.all([...fontFiles].map((filename) => access(filename)));
await Promise.all([...fontFiles].map((filename) => copyFile(filename, path.join(assetsDirectory, path.basename(filename)))));
await copyFile(path.join(frontend, 'public/hamagiku-logo.png'), path.join(assetsDirectory, 'hamagiku-logo.png'));
assert.doesNotMatch(commonCss, /url\(['"]?\/_next\//, '未解決の本番アセットURLがあります');
const fontClasses = [...commonCss.matchAll(/\.(__variable_[a-z0-9]+)\{--font-/g)].map((match) => match[1]);

// 画像も同梱データとして固定する。写真1枚＋ロゴ1枚でロゴ有無をPDF画像数から監査できる。
const photoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="960" height="720" fill="#d5d1c8"/><rect x="0" y="440" width="960" height="280" fill="#9b947f"/><path d="M120 470c80-210 225-215 315-20 85-200 245-200 385 20l-42 18H158z" fill="#5f4f3b"/><circle cx="370" cy="330" r="18" fill="#1a3c34"/><circle cx="600" cy="320" r="18" fill="#1a3c34"/><text x="480" y="650" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="34">STATIC MONTHLY FIXTURE</text></svg>`;
const photoDataUri = `data:image/svg+xml;base64,${Buffer.from(photoSvg).toString('base64')}`;
const weights = [445, 445, 455, 464, 473];
const monthKeys = ['2026-02', '2026-04', '2026-05', '2026-07', '2026-08'];
const comments = {
    ja: '現在は週6日、1ハロン20〜22秒のペースで3,200mのキャンターを行っております。また週に1回、1ハロン18〜19秒のペースで600mのつめのを取り入れております。',
    en: 'The horse is currently cantering 3,200m six days a week at 20–22 seconds per furlong, with a 600m sharper session at 18–19 seconds once a week.',
};

const longTextFixture = {
    horseNameJp: 'ワイルドイントリーグの24',
    horseNameEn: 'Wild Intrigue 24 Thoroughbred Partnership International',
    sireJp: 'ラッキーベガ系統の優良種牡馬ワイルドイントリーグ',
    sireEn: 'Lucky Vega Thoroughbred Stallion Partnership International',
    damJp: 'サンプルカルメンオブザハマギクファーム',
    damEn: 'Sample Carmen of Hamagiku Farm Bloodstock Partnership',
    ownerName: '株式会社浜菊ファーム・サラブレッド・パートナーズ共有組合',
    ownerNameEn: 'Hamagiku Farm Thoroughbred Racing and Bloodstock Partnership International',
};

const wrapStressFixture = {
    // 31文字。日本語の禁則・折返しが無い場合に右側の血統欄へ侵入する長さ。
    horseNameJp: 'ワイルドイントリーグ二〇二四年産サラブレッド長名回帰検証用馬名',
    horseNameEn: 'WildIntrigueTwentyFourThoroughbredPartnershipInternationalEdition',
    sireJp: 'ラッキーベガ系統の優良種牡馬ワイルドイントリーグ回帰検証用',
    sireEn: 'LuckyVegaThoroughbredStallionPartnershipInternationalBloodstockEdition',
    damJp: 'サンプルカルメンオブザハマギクファーム回帰検証用繁殖牝馬',
    damEn: 'SampleCarmenOfHamagikuFarmBloodstockPartnershipInternationalEdition',
    ownerName: '株式会社浜菊ファーム・サラブレッド・パートナーズ共有組合長名検証',
    ownerNameEn: 'HamagikuFarmThoroughbredRacingAndBloodstockPartnershipInternationalEdition',
};

function fixtureData({ language, logo, profile = 'standard' }, index = 0) {
    const suffix = index ? ` ${index + 1}` : '';
    const profileData = profile === 'long' ? longTextFixture : profile === 'wrap-stress' ? wrapStressFixture : {
        horseNameJp: `静的監査馬${index ? ` ${index + 1}` : ''}`,
        horseNameEn: `Static Audit Horse${suffix}`,
        sireJp: 'ラッキーベガ', sireEn: 'Lucky Vega',
        damJp: 'サンプルカルメン', damEn: 'Sample Carmen',
        ownerName: '株式会社サンプルレーシング', ownerNameEn: 'Sample Racing Partnership',
    };
    return {
        reportDate: '2026-08',
        horseNameEn: profileData.horseNameEn, horseNameJp: profileData.horseNameJp,
        sire: profileData.sireEn, sireEn: profileData.sireEn, sireJp: profileData.sireJp,
        dam: profileData.damEn, damEn: profileData.damEn, damJp: profileData.damJp,
        ownerName: profileData.ownerName, ownerNameEn: profileData.ownerNameEn,
        trainerNameJp: '検証用調教師', trainerNameEn: 'Sample Training Stable',
        trainerLocation: '北海道', trainerLocationEn: 'Hokkaido', birthDate: '2023-04-12', age: 3, sex: 'Colt',
        outputMode: 'print', showLogo: logo, mainPhoto: photoDataUri, originalPhoto: '',
        trainingStatusEn: 'Training', trainingStatusJp: 'トレーニング', conditionEn: 'Good', conditionJp: '良好',
        weight: '473 kg', targetEn: 'Debut', targetJp: 'デビュー戦', commentEn: comments.en, commentJp: comments.ja,
        careRecords: [], weightHistory: weights.map((value, i) => ({ label: monthKeys[i], monthKey: monthKeys[i], value })), logo: null,
    };
}

// 外側のアプリUIだけを置き換える。欄・写真・印刷寸法は本番CSSを直接使う。
const auditCss = `
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body { width: 210mm; min-width: 210mm; }
    .monthly-single, .monthly-batch-root { width: 210mm; margin: 0; padding: 0; }
    .monthly-single .preview-wrapper { display: flex !important; width: 210mm !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; background: #fff !important; }
    .monthly-single .report-preview { margin: 0 !important; box-shadow: none !important; transform: none !important; }
    .monthly-batch-root .reports-list { display: block; padding: 0; margin: 0; }
    .monthly-batch-root .preview-wrapper { padding: 0; margin: 0; }
    @media print {
        .monthly-single, .monthly-single .preview-wrapper { height: 287mm !important; min-height: 0 !important; break-inside: avoid; page-break-inside: avoid; }
        .no-print { display: none !important; }
    }
`;

const fixtures = [];
for (const language of ['ja', 'en']) {
    for (const logo of [false, true]) {
        for (const kind of ['single', 'batch']) {
            for (const profile of ['standard', 'long', 'wrap-stress']) {
                const id = `${language}-${kind}-${logo ? 'logo' : 'nologo'}${profile === 'long' ? '-long-text' : profile === 'wrap-stress' ? '-wrap-stress' : ''}`;
                if (only && id !== only) continue;
                const reportCount = kind === 'batch' ? 2 : 1;
                const rendered = Array.from({ length: reportCount }, (_, index) => renderReport(language, fixtureData({ language, logo, profile }, index), kind !== 'single'));
            const bodyContent = kind === 'batch'
                ? `<div class="reports-list">${rendered.map((html) => `<div class="page-break-after-always">${html.replace(/@import[^;]*fonts\.googleapis\.com[^;]*;/g, '').replace(/src="\/hamagiku-logo\.png"/g, 'src="./assets/hamagiku-logo.png"')}</div>`).join('')}</div>`
                : rendered[0].replace(/@import[^;]*fonts\.googleapis\.com[^;]*;/g, '').replace(/src="\/hamagiku-logo\.png"/g, 'src="./assets/hamagiku-logo.png"');
            const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>月次レポート印刷検証</title><style>${commonCss}</style><style>${kind === 'batch' ? batchPrintCss : ''}</style><style>${auditCss}</style></head><body class="${fontClasses.join(' ')} antialiased font-sans${kind === 'batch' ? ' batch-print batch-print-view' : ''}"><div class="${kind === 'batch' ? 'monthly-batch-root batch-report-page' : 'monthly-single'}">${bodyContent}</div><script>
                document.title = 'monthly-audit:fonts-pending';
                document.fonts.ready.then(() => { document.title = document.fonts.status === 'loaded' ? 'monthly-audit:fonts-ready' : 'monthly-audit:fonts-failed'; }).catch(() => { document.title = 'monthly-audit:fonts-failed'; });
            </script></body></html>`;
            const filename = path.join(directory, `${id}.html`);
            await writeFile(filename, html);
            const xAxisLabels = language === 'ja'
                ? ['26/2', '26/4', '26/5', '26/7', '26/8']
                : ['Feb 26', 'Apr 26', 'May 26', 'Jul 26', 'Aug 26'];
                const data = fixtureData({ language, logo, profile });
                const hasLongText = profile !== 'standard';
                const visibleText = language === 'ja'
                    ? [data.horseNameJp, data.horseNameEn, data.sireJp, data.damJp, data.ownerName]
                    : [data.horseNameEn, data.horseNameJp, data.sireEn, data.damEn, data.ownerNameEn];
                fixtures.push({
                    id, kind, language, logo, profile, reportCount, expectedPages: reportCount,
                    expectedImageCountMin: 1, expectedLogoImageCount: logo ? 1 : 0,
                    weights, xAxisLabels, commentLegend: language === 'ja' ? 'コメント' : 'COMMENT',
                    html: filename, pdf: filename.replace(/\.html$/, '.pdf'), source: 'frontend/components/ReportTemplate.tsx',
                    expectedText: [language === 'ja' ? comments.ja : comments.en, '473 kg', ...(hasLongText ? visibleText : [])],
                    ...(hasLongText ? {
                        layoutGroups: {
                            horseName: [data.horseNameJp, data.horseNameEn],
                            pedigree: language === 'ja' ? [data.sireJp, data.damJp] : [data.sireEn, data.damEn],
                            owner: [language === 'ja' ? data.ownerName : data.ownerNameEn],
                        },
                    } : {}),
                });
            }
        }
    }
}
assert.ok(fixtures.length, '一致する検証条件がありません');
await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(fixtures, null, 2));
console.log(JSON.stringify({ directory, fixtures: fixtures.map(({ id }) => id), weights, xAxisLabels: { ja: ['26/2', '26/4', '26/5', '26/7', '26/8'], en: ['Feb 26', 'Apr 26', 'May 26', 'Jul 26', 'Aug 26'] } }, null, 2));
