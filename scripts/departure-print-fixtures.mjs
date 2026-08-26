import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { access, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 本番の帳票部品をそのまま静的描画し、画面CSSの印刷への置換は行わない。
// 認証・通信と言語選択だけを検証用に置き換え、実データは扱わない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const requireFrontend = createRequire(path.join(frontend, 'package.json'));
const { build } = requireFrontend('esbuild');
const label = process.argv.find(value => value.startsWith('--label='))?.slice(8) || 'current';
assert.match(label, /^[a-z0-9-]+$/);
const only = process.argv.find(value => value.startsWith('--case='))?.slice(7);
const sourceRef = process.argv.find(value => value.startsWith('--source-ref='))?.slice(13);
if (sourceRef) assert.match(sourceRef, /^[a-f0-9]{7,40}$/);
const directory = path.join(root, 'tmp/departure-print-audit', label);
await mkdir(directory, { recursive: true });
const assetsDirectory = path.join(directory, 'assets');
await mkdir(assetsDirectory, { recursive: true });

const bundle = path.join(directory, 'fixture.cjs');
await build({
    absWorkingDir: frontend,
    tsconfig: path.join(root, 'scripts/departure-print.tsconfig.json'),
    stdin: {
        contents: `
            import React from 'react';
            import { renderToStaticMarkup } from 'react-dom/server';
            import DepartureReportTemplate from '@/components/DepartureReportTemplate';
            import { setAuditLanguage } from '@/contexts/LanguageContext';
            export function renderReport(language, data) {
                setAuditLanguage(language);
                return renderToStaticMarkup(<DepartureReportTemplate initialData={data} readOnly />);
            }
        `,
        resolveDir: frontend,
        sourcefile: 'departure-print-audit.tsx',
        loader: 'tsx',
    },
    bundle: true,
    jsx: 'transform',
    define: { 'process.env.NODE_ENV': '"production"' },
    platform: 'node',
    format: 'cjs',
    outfile: bundle,
    plugins: [{
        name: 'isolated-print-fixture',
        setup(builder) {
            builder.onResolve({ filter: /^@\/contexts\/LanguageContext$/ }, () => ({ path: 'language', namespace: 'audit' }));
            builder.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: 'api', namespace: 'audit' }));
            builder.onLoad({ filter: /.*/, namespace: 'audit' }, ({ path: name }) => ({
                contents: name === 'language'
                    ? `let language = 'ja'; export function setAuditLanguage(value) { language = value; }
                       export function useLanguage() { return { language, t: key => key === 'departureReport' ? (language === 'ja' ? '退厩レポート' : 'Departure Report') : key }; }`
                    : `export async function getApiAuthHeaders() { throw new Error('検証中の通信は禁止です'); }
                       export async function translateDepartureFields() { throw new Error('検証中の翻訳通信は禁止です'); }`,
            }));
            builder.onLoad({ filter: /DepartureReportTemplate\.tsx$/ }, async ({ path: filename }) => {
                const source = sourceRef
                    ? execFileSync('git', ['show', `${sourceRef}:frontend/components/DepartureReportTemplate.tsx`], { cwd: root, encoding: 'utf8' })
                    : await readFile(filename, 'utf8');
                assert.equal(source.match(/<style jsx global>/g)?.length, 1);
                if (!sourceRef) {
                    // Type3名だけでは判別できないフォントの太さ・継承元を、元コードでも検査する。
                    assert.doesNotMatch(source, /\b(?:Arial|font-semibold|font-extrabold|font-black)\b/);
                    for (const [, weight] of source.matchAll(/font-weight:\s*(\d+)/g)) {
                        assert.ok(['400', '500', '700'].includes(weight), `未配信の太さ: ${weight}`);
                    }
                    const families = [...source.matchAll(/font-family:\s*([^;]+);/g)].map(match => match[1]);
                    assert.equal(families.length, 2, 'フォント指定はルートと継承だけに限定する');
                    assert.ok(families[0].startsWith('var(--font-noto-sans-jp)') && families[1] === 'inherit');
                }
                return {
                    // styled-jsx同様にCSSをraw textで出し、子セレクターの「>」をHTMLエスケープしない。
                    contents: source.replace(/<style jsx global>\{([\s\S]+?)\}<\/style>/g, '<style dangerouslySetInnerHTML={{ __html: $1 }} />'),
                    loader: 'tsx',
                    resolveDir: path.dirname(filename),
                };
            });
        },
    }],
});
const { renderReport } = requireFrontend(bundle);

// ビルド済みの共通CSS・実フォントを利用。外部アイコンフォントは帳票で使わない。
const cssDirectory = path.join(frontend, '.next/static/css');
const cssFiles = (await readdir(cssDirectory)).filter(name => name.endsWith('.css')).sort();
assert.ok(cssFiles.length, '先にfrontendの本番ビルドを行ってください');
const fontFiles = new Set();
const styles = await Promise.all(cssFiles.map(async name => {
    const source = await readFile(path.join(cssDirectory, name), 'utf8');
    return source
        .replace(/@import[^;]*fonts\.googleapis\.com[^;]*;/g, '')
        .replace(/url\((['"]?)((?:\.\.\/media\/|\/_next\/static\/media\/)[^)'"\s]+)\1\)/g,
            (_, quote, relative) => {
                const filename = relative.startsWith('/_next/')
                    ? path.join(frontend, '.next', relative.slice('/_next/'.length))
                    : path.resolve(cssDirectory, relative);
                fontFiles.add(filename);
                // Macへの受け渡しと画面検証にも使えるよう、参照は同梱アセットに限定する。
                return `url("./assets/${path.basename(filename)}")`;
            });
}));
const commonCss = styles.join('\n');
assert.ok(fontFiles.size, '本番フォントのローカル参照が必要です');
await Promise.all([...fontFiles].map(filename => access(filename)));
await Promise.all([...fontFiles].map(filename => copyFile(filename, path.join(assetsDirectory, path.basename(filename)))));
await copyFile(path.join(frontend, 'public/hamagiku-logo.png'), path.join(assetsDirectory, 'hamagiku-logo.png'));
assert.doesNotMatch(commonCss, /url\(['"]?\/_next\//, '未解決の本番アセットURLがあります');
const fontClasses = [...commonCss.matchAll(/\.(__variable_[a-z0-9]+)\{--font-/g)].map(match => match[1]);
assert.match(commonCss, /--font-noto-sans-jp:/, '本番の日本語フォントCSSが必要です');

const fixtures = [];
for (const language of ['ja', 'en']) {
    for (const content of ['sample', 'standard', 'long', 'long-names', 'missing', 'dam-only']) {
        for (const logo of [false, true]) {
            for (const margins of ['css', 'zero']) {
                const id = `${language}-${content}-${logo ? 'logo' : 'nologo'}-${margins}`;
                if (['long-names', 'missing', 'dam-only'].includes(content) && (!logo || margins !== 'css')) continue;
                if (only && id !== only) continue;
                const commentCount = content === 'sample' ? 0 : content === 'long' ? 24 : 2;
                const data = {
                    reportDate: '2026-08-24', horseNameJp: 'レイアウト検証馬', horseNameEn: 'Sample Horse',
                    ownerName: '株式会社サンプルサラブレッドレーシング', ownerNameEn: 'Sample Thoroughbred Racing Partnership',
                    trainerNameJp: '検証用ロングネーム調教師', trainerNameEn: 'Sample Longname Training Stable',
                    sexAgeJp: '牡2歳', sexAgeEn: 'Colt, 2 years',
                    sireJp: 'リアルインパクト', sireEn: 'Real Impact', damJp: 'サンプルカルメン', damEn: 'Sample Carmen',
                    weight: '497kg', weightDate: '2026-08-24', farrierDate: '2026-08-21',
                    wormingJp: 'エクイバランゴールド', wormingEn: 'Eqvalan Gold', wormingDate: '2026-08-21',
                    feedingJp: '燕麦2.5kg、配合ペレット2kg、ミックス2kg、粗飼料1.5kg',
                    feedingEn: 'Oats 2.5kg, feed pellets 2kg, mix 2kg, roughage 1.5kg.',
                    exerciseJp: '1ハロン20〜22秒ペースで3,600mのメニューを中心に、週1回1ハロン19秒のギャロップと、週1回坂路で1ハロン15〜16秒の登坂を2本消化しています。',
                    exerciseEn: 'The main training programme is 3,600m at 20–22 seconds per furlong, with a gallop at 19 seconds per furlong once a week and two hill climbs at 15–16 seconds per furlong once a week.',
                    commentJp: Array.from({ length: commentCount }, (_, index) => `確認${String(index + 1).padStart(2, '0')}：健康状態は良好です。引き続き馬体と食欲の変化に留意しながら、無理のない調整をお願いします。`).join('\n'),
                    commentEn: Array.from({ length: commentCount }, (_, index) => `Check ${String(index + 1).padStart(2, '0')}: The horse is in good condition. Please continue to monitor body condition and appetite while following a steady training programme.`).join('\n'),
                    showLogo: logo, outputMode: 'print',
                };
                if (content === 'long-names') {
                    Object.assign(data, {
                        horseNameJp: 'サンプルサラブレッドレーシング検証用ロングネーム号',
                        horseNameEn: 'Sample Thoroughbred Racing Partnership Longname Audit Horse',
                        sireJp: 'ノーザンサラブレッドレーシング検証用ロングネーム種牡馬',
                        sireEn: 'Northern Thoroughbred Racing Longname Reference Stallion',
                        damJp: 'サザンサラブレッドレーシング検証用ロングネーム繁殖牝馬',
                        damEn: 'Southern Thoroughbred Racing Longname Reference Broodmare',
                    });
                }
                if (content === 'missing' || content === 'dam-only') {
                    Object.assign(data, { sexAgeJp: '', sexAgeEn: '', sireJp: '', sireEn: '' });
                    if (content === 'missing') Object.assign(data, { damJp: '', damEn: '' });
                }
                const report = renderReport(language, data)
                    .replace(/src="\/hamagiku-logo\.png"/g, 'src="./assets/hamagiku-logo.png"');
                assert.doesNotMatch(report, /src="\//, '同梱されていないアセットがあります');
                if (!sourceRef) {
                    // 帳票だけでなく、入力欄も馬のプロフィールを先にまとめる。
                    const form = report.match(/<aside\b[\s\S]*?<\/aside>/)?.[0];
                    assert.ok(form, '入力欄がありません');
                    const labels = language === 'ja' ? ['馬名', '性齢', '父', '母', '馬主', '調教師'] : ['Horse name', 'Sex / age', 'Sire', 'Dam', 'Owner', 'Trainer'];
                    const positions = labels.map(value => form.indexOf(`>${value}</span>`));
                    assert.ok(positions.every((value, index) => value >= 0 && (index === 0 || value > positions[index - 1])), '入力欄の馬情報の順序が不正です');
                }
                // 用紙余白がゼロに上書きされるケースも、実PDFとして回帰検査する。
                const override = margins === 'zero'
                    ? '<style>@media print { @page { margin: 0 !important; } @page hamagiku-departure { margin: 0 !important; } }</style>' : '';
                const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>退厩レポート印刷検証</title><style>${commonCss}</style></head>
                    <body class="${fontClasses.join(' ')} antialiased font-sans overflow-hidden">
                    <div class="departure-editor fixed inset-0 overflow-y-auto overscroll-y-contain md:static md:h-screen md:overflow-hidden flex flex-col items-stretch md:items-center py-2 sm:py-8 font-sans print:py-0 print:block print:static print:min-h-0 print:h-auto print:overflow-visible print:bg-white bg-gray-100">
                        <div class="report-editor-surface w-full block md:flex md:flex-1 md:min-h-0 md:justify-center overflow-x-visible overflow-y-visible md:overflow-x-auto md:overflow-y-hidden pb-0 print:pb-0 print:overflow-visible">${report}</div>
                    </div>${override}<script>
                    // PDF内の可変フォント名がType3になる場合も、実フォントの読み込みを証明する。
                    document.title = 'departure-audit:fonts-pending';
                    document.fonts.ready.then(async () => {
                        const paragraph = document.querySelector('.departure-narrative p');
                        const faces = await document.fonts.load('400 15px "Noto Sans JP"', paragraph.textContent);
                        const family = getComputedStyle(paragraph).fontFamily;
                        document.title = faces.length && faces.every(face => face.status === 'loaded') && family.includes('Noto Sans JP')
                            ? 'departure-audit:NotoSansJP-ready' : 'departure-audit:fonts-failed';
                    }).catch(() => { document.title = 'departure-audit:fonts-failed'; });
                    </script></body></html>`;
                const filename = path.join(directory, `${id}.html`);
                await writeFile(filename, html);
                const expectedText = language === 'ja'
                    ? [data.ownerName, data.trainerNameJp, data.sireJp, data.damJp, data.wormingJp, data.feedingJp, data.exerciseJp, ...data.commentJp.split('\n')]
                    : [data.ownerNameEn, data.trainerNameEn, data.sireEn, data.damEn, data.wormingEn, data.feedingEn, data.exerciseEn, ...data.commentEn.split('\n')];
                const identityText = language === 'ja'
                    ? { horseName: data.horseNameJp, sexAge: data.sexAgeJp, sire: data.sireJp, dam: data.damJp, owner: data.ownerName, trainer: data.trainerNameJp }
                    : { horseName: data.horseNameEn, sexAge: data.sexAgeEn, sire: data.sireEn, dam: data.damEn, owner: data.ownerNameEn, trainer: data.trainerNameEn };
                fixtures.push({ id, language, content, logo, margins, commentCount, identityText, sourceRef: sourceRef || 'working-tree', expectedText: expectedText.filter(Boolean), html: filename, pdf: filename.replace(/\.html$/, '.pdf') });
            }
        }
    }
}
assert.ok(fixtures.length, '一致する検証条件がありません');
await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(fixtures, null, 2));
console.log(JSON.stringify({ directory, fixtures: fixtures.map(({ id }) => id) }, null, 2));
