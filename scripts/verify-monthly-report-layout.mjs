import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playwrightは開発環境のものを使用する。Codex同梱版はNODE_PATHでも指定できる。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = requireFrontend('playwright');
const label = process.argv.find(value => value.startsWith('--label='))?.slice(8) || 'current';
const channel = process.argv.find(value => value.startsWith('--browser='))?.slice(10) || 'chrome';
const writePdfs = process.argv.includes('--write-pdfs');
assert.match(label, /^[a-z0-9-]+$/);
assert.ok(['chrome', 'msedge'].includes(channel));
const directory = path.join(root, 'tmp/monthly-report-print-audit', label);
const fixtures = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
const browser = await chromium.launch({ channel, headless: true });
const results = [];
try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1250 } });
    // fixtureはフォントを含めてローカルに完結させ、外部通信があれば失敗させる。
    await page.route(/^https?:/, route => route.abort());
    for (const fixture of fixtures) {
        for (const media of ['screen', 'print']) {
            for (const fallback of [false, true]) {
                await page.emulateMedia({ media });
                await page.goto(pathToFileURL(fixture.html).href);
                await page.evaluate(async () => {
                    await document.fonts.ready;
                    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
                });
                if (fallback) await page.addStyleTag({ content: `
                    .report-preview .font-serif-en, .report-preview .font-serif-jp {
                        font-family: Arial, 'Yu Gothic', sans-serif !important;
                    }
                ` });
                const layout = await page.evaluate(({ media, logo }) => {
                    const failures = [];
                    const gaps = [];
                    const rects = element => {
                        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                        const values = [];
                        while (walker.nextNode()) {
                            if (!walker.currentNode.textContent.trim()) continue;
                            const range = document.createRange();
                            range.selectNodeContents(walker.currentNode);
                            values.push(...[...range.getClientRects()].filter(rect => rect.width > 0));
                        }
                        return values;
                    };
                    for (const report of document.querySelectorAll('.report-preview')) {
                        const names = report.querySelector('.horse-name-block') || report.querySelector('.horse-name-primary').parentElement.parentElement;
                        const pedigree = report.querySelector('.pedigree-block, .sire-dam-line');
                        const owner = report.querySelector('.owner-line');
                        const photo = report.querySelector('.main-photo');
                        const nameBox = names.getBoundingClientRect();
                        const pedigreeBox = pedigree.getBoundingClientRect();
                        const ownerBox = owner.getBoundingClientRect();
                        const photoBox = photo.getBoundingClientRect();
                        const expectedPhotoHeight = (logo ? (media === 'print' ? 98 : 99) : 90) * 96 / 25.4;
                        if (Math.abs(photoBox.height - expectedPhotoHeight) > 1) failures.push(`写真の高さが変化: ${photoBox.height}px（期待 ${expectedPhotoHeight}px）`);
                        const nameRects = rects(names);
                        const pedigreeRects = rects(pedigree);
                        const ownerRects = rects(owner);
                        const gap = pedigreeBox.left - Math.max(...nameRects.map(rect => rect.right));
                        gaps.push(gap);
                        if (gap < 4) failures.push(`馬名末尾と血統罫線の離隔不足: ${gap}px`);
                        for (const [group, box, values] of [
                            ['馬名', nameBox, nameRects], ['血統', pedigreeBox, pedigreeRects], ['馬主', ownerBox, ownerRects],
                        ]) {
                            if (!values.length) failures.push(`${group}の文字がない`);
                            if (values.some(rect => rect.left < box.left - 1 || rect.right > box.right + 1)) {
                                failures.push(`${group}が欄の左右にはみ出した`);
                            }
                        }
                        const profileBottom = Math.max(...nameRects.concat(pedigreeRects).map(rect => rect.bottom));
                        if (profileBottom > ownerBox.top + 1) failures.push('馬名・血統と馬主欄が重なった');
                        if (Math.max(...ownerRects.map(rect => rect.bottom)) > photoBox.top + 1) failures.push('馬主欄と写真が重なった');
                        // 非表示領域に文字が存在するだけの偽陰性を避ける。
                        for (const element of report.querySelectorAll('.horse-name-primary, .horse-name-secondary, .pedigree-value, .owner-value')) {
                            for (const textRect of rects(element)) {
                                for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
                                    const style = getComputedStyle(ancestor);
                                    const box = ancestor.getBoundingClientRect();
                                    if (['hidden', 'clip'].includes(style.overflowX) && (textRect.left < box.left - 1 || textRect.right > box.right + 1)) failures.push('祖先要素による文字の左右切り抜き');
                                    if (['hidden', 'clip'].includes(style.overflowY) && (textRect.top < box.top - 4 || textRect.bottom > box.bottom + 4)) failures.push('祖先要素による文字の上下切り抜き');
                                }
                            }
                        }
                    }
                    return { failures: [...new Set(failures)], minNameToBorderGapPx: Math.min(...gaps) };
                }, { media, logo: fixture.logo });
                results.push({ case: fixture.id, media, fallback, ...layout });
                if (writePdfs && media === 'print' && !fallback) {
                    await page.pdf({ path: fixture.pdf, preferCSSPageSize: true, printBackground: true });
                }
                if (!fallback && fixture.id === 'ja-single-logo-long-text') {
                    await page.screenshot({ path: path.join(directory, `${channel}-${fixture.id}-${media}.png`), fullPage: true });
                }
            }
        }
    }
} finally {
    await browser.close();
}
await writeFile(path.join(directory, `layout-${channel}.json`), JSON.stringify(results, null, 2));
const failed = results.filter(value => value.failures.length);
console.log(JSON.stringify({ browser: channel, checks: results.length, passed: results.length - failed.length, failed }, null, 2));
assert.equal(failed.length, 0, '月次レポートの画面/印刷レイアウトに回帰があります');
