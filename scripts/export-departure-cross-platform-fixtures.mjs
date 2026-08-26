import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 合格したローカル検証だけをMacへ渡す。認証情報や一時プロファイルはコピーしない。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const label = process.argv.find(value => value.startsWith('--label='))?.slice(8) || 'profile-final-chrome';
assert.match(label, /^[a-z0-9-]+$/);
const packageName = process.argv.find(value => value.startsWith('--package='))?.slice(10) || `mac-${label}`;
assert.match(packageName, /^[a-z0-9-]+$/);
const source = path.join(root, 'tmp/departure-print-audit', label);
const outputRoot = path.join(root, 'output/pdf/departure-print-audit');
const destination = path.join(outputRoot, packageName);
const fixtures = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
const results = JSON.parse(await readFile(path.join(source, 'results.json'), 'utf8'));
assert.equal(fixtures.length, 30, '全30条件が必要です');
assert.equal(results.length, fixtures.length);
const resultsByCase = new Map(results.map(result => [result.case, result]));
assert.equal(resultsByCase.size, fixtures.length);
assert.ok(fixtures.every(fixture => resultsByCase.get(fixture.id)?.pass), '不合格の条件は出力できません');

await mkdir(outputRoot, { recursive: true });
await mkdir(destination); // 既存の検証一式を上書きしない。
await mkdir(path.join(destination, 'assets'));
const exportedFiles = [];
const cases = [];
for (const fixture of fixtures) {
    assert.match(fixture.id, /^[a-z0-9-]+$/);
    const filename = `${fixture.id}.html`;
    assert.equal(path.resolve(fixture.html), path.join(source, filename));
    const html = await readFile(fixture.html, 'utf8');
    assert.doesNotMatch(html, /file:\/\/\/|(?:src|href)=["'](?:https?:\/\/|\/)|url\(\s*["']?https?:\/\//i, '外部・端末固有の参照が残っています');
    await copyFile(fixture.html, path.join(destination, filename));
    exportedFiles.push(filename);
    cases.push({
        id: fixture.id, html: filename, language: fixture.language,
        content: fixture.content, logo: fixture.logo, margins: fixture.margins,
        expectedPages: resultsByCase.get(fixture.id).pages,
        identityText: fixture.identityText, expectedText: fixture.expectedText,
    });
}
for (const filename of await readdir(path.join(source, 'assets'))) {
    assert.match(filename, /^[a-zA-Z0-9_.-]+\.(?:woff2?|png)$/);
    await copyFile(path.join(source, 'assets', filename), path.join(destination, 'assets', filename));
    exportedFiles.push(`assets/${filename}`);
}
await copyFile(path.join(root, 'ops/DEPARTURE_PROFILE_MAC_CHECK_20260826.md'), path.join(destination, 'README.md'));
await writeFile(path.join(destination, 'cases.json'), JSON.stringify(cases, null, 2));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceHash = createHash('sha256').update(await readFile(path.join(root, 'frontend/components/DepartureReportTemplate.tsx'))).digest('hex');
const rows = cases.map(item => `<tr><td>${item.language === 'ja' ? '日本語' : 'English'}</td><td><a href="./${item.html}">${item.content}</a></td><td>${item.logo ? 'あり' : 'なし'}</td><td>${item.margins}</td><td>${item.expectedPages}</td></tr>`).join('\n');
await writeFile(path.join(destination, 'index.html'), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>退厩レポート Mac最終確認</title><style>body{font-family:sans-serif;max-width:960px;margin:40px auto;padding:0 24px;line-height:1.7;color:#26342d}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}a{color:#15653f}code{overflow-wrap:anywhere}</style></head><body><h1>退厩レポート：Mac最終確認</h1><p>Mac実機での確認は未実施です。架空データのみで、本番データは変更しません。</p><p><a href="./README.md">確認手順</a>に従い、ChromeとSafariで全条件を確認してください。レポートを開いたらフォントの読み込みを待ち、A4・縦・倍率100%・ブラウザ自身のヘッダーとフッターなしでPDF保存します。画面では馬名周辺と紙の下端も確認します。</p><p>期待値はWindows実PDFの合格結果です。longのみ複数ページが正常です。Macで差が出た場合はPDFと環境情報を記録し、本番へは反映しません。</p><table><thead><tr><th>言語</th><th>内容</th><th>ロゴ</th><th>余白条件</th><th>想定ページ数</th></tr></thead><tbody>${rows}</tbody></table><p>元コード: <code>${sourceCommit}</code><br>テンプレートSHA-256: <code>${sourceHash}</code></p></body></html>`);
exportedFiles.push('README.md', 'cases.json', 'index.html');
const hashes = {};
for (const filename of exportedFiles.sort()) {
    hashes[filename] = createHash('sha256').update(await readFile(path.join(destination, filename))).digest('hex');
}
await writeFile(path.join(destination, 'sha256.json'), JSON.stringify({ sourceCommit, sourceHash, files: hashes }, null, 2));
console.log(JSON.stringify({ destination, cases: cases.length, files: exportedFiles.length + 1, sourceCommit, sourceHash }, null, 2));
