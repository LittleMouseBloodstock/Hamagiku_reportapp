import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));
const { transform } = requireFrontend('esbuild');
const source = await readFile(path.join(root, 'frontend/app/reports/[id]/page.tsx'), 'utf8');
// 実際の読込・下書き復元で使う関数を取り出し、マスターと入力値が異なる条件を検査する。
const resolver = source.match(/const resolvePedigreeFields = \([\s\S]*?\n\}\);/)?.[0];
assert.ok(resolver, '血統の読込処理が見つかりません');
const compiled = await transform(resolver + '\nexport { resolvePedigreeFields };', { loader: 'ts', format: 'esm' });
const { resolvePedigreeFields } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);
const horse = { sire: 'フランケル', sire_en: 'Frankel', dam: '母マスター', dam_en: 'Master Dam' };
const saved = { sire: '旧父表記', sireJp: 'Frankel', sireEn: 'Saved Sire', dam: '旧母表記', damJp: '保存母', damEn: 'Saved Dam' };

test('退厩レポートの日本語父馬欄に入力した英語表記を読込後も保持する', () => {
    const actual = resolvePedigreeFields(horse, saved, 'departure');
    assert.equal(actual.sireJp, 'Frankel');
    const previous = resolvePedigreeFields(horse, saved);
    assert.deepEqual({ ...actual, sireJp: previous.sireJp }, previous, '日本語父馬欄以外は従来どおり');
});

test('退厩レポートの日本語父馬欄の手入力表記・記号・空白も保持する', () => {
    for (const sireJp of ["King's Best (USA)", 'Sea The Stars', '  Frankel  ', '日本語で入力した父馬']) {
        assert.equal(resolvePedigreeFields(horse, { ...saved, sireJp }, 'departure').sireJp, sireJp);
    }
});

test('退厩レポートの未入力欄は従来どおり馬マスターを使う', () => {
    for (const value of [undefined, null, '']) {
        assert.equal(resolvePedigreeFields(horse, { sireJp: value }, 'departure').sireJp, horse.sire);
    }
    assert.equal(resolvePedigreeFields(null, saved, 'departure').sireJp, 'Frankel');
});

test('月次・状況レポートと種別未指定のマスター優先動作を変えない', () => {
    const expected = { sire: horse.sire, sireJp: horse.sire, sireEn: horse.sire_en, dam: horse.dam, damJp: horse.dam, damEn: horse.dam_en };
    for (const kind of ['monthly', 'status', undefined, null]) {
        assert.deepEqual(resolvePedigreeFields(horse, saved, kind), expected);
    }
});

test('通常読込・フォールバック読込・下書き復元から退厩の種別が渡る', () => {
    assert.ok(/resolvePedigreeFields\(horse, draftData, draftType\)/.test(source), '下書き復元で種別を渡す');
    assert.ok(/resolvePedigreeFields\(horse, metrics, 'departure'\)/.test(source), '通常読込で退厩の種別を渡す');
    assert.ok(/resolvePedigreeFields\(horse, metrics, metrics\.reportType\)/.test(source), 'フォールバック読込で種別を渡す');
});
