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
const batchSource = await readFile(path.join(root, 'frontend/app/dashboard/clients/[id]/reports/page.tsx'), 'utf8');
// 単票・下書き復元の実関数と、一括印刷の実際の血統マッピングを検査する。
const resolver = source.match(/const resolvePedigreeFields = \([\s\S]*?\n\}\);/)?.[0];
assert.ok(resolver, '血統の読込処理が見つかりません');
const compiled = await transform(resolver + '\nexport { resolvePedigreeFields };', { loader: 'ts', format: 'esm' });
const { resolvePedigreeFields } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);
const fields = ['sire', 'sireJp', 'sireEn', 'dam', 'damJp', 'damEn'];
const batchMapping = batchSource.match(/const rData: ReportData = \{([\s\S]*?)\n\s*\};/)?.[1];
assert.ok(batchMapping, '一括レポートの実データ変換が見つかりません');
const declarations = fields.map(key => {
    const expression = batchMapping.match(new RegExp(`(?:^|\\n)\\s*${key}: ([^\\n]+),`))?.[1];
    assert.ok(expression, `一括レポートの${key}を取得できません`);
    return `${key}: ${expression}`;
});
const batchResolve = new Function('horse', 'metrics', `return ({${declarations.join(',')}});`);
const horse = { sire: 'フランケル', sire_en: 'Master Sire', dam: '母マスター', dam_en: 'Master Dam' };
const saved = { sireJp: 'Frankel', sireEn: "King's Best (USA)", damJp: 'Sea The Stars', damEn: 'Custom Dam (IRE)' };
const expected = { sire: saved.sireJp, sireJp: saved.sireJp, sireEn: saved.sireEn, dam: saved.damJp, damJp: saved.damJp, damEn: saved.damEn };

test('月次・退厩・状況の単票/下書きは父母の日英入力値をすべて保持する', () => {
    assert.deepEqual(resolvePedigreeFields(horse, saved), expected);
    const restored = JSON.parse(JSON.stringify(saved));
    assert.deepEqual(resolvePedigreeFields(horse, restored), expected);
});

test('月次一括でも保存済みの父母の日英表記を保持する', () => {
    assert.deepEqual(batchResolve(horse, saved), expected);
});

test('未入力の欄だけ馬マスターで補完し、他の入力値を上書きしない', () => {
    const partial = { sireJp: 'Frankel', sireEn: '', damJp: '', damEn: 'Custom Dam' };
    const expectedPartial = { sire: 'Frankel', sireJp: 'Frankel', sireEn: horse.sire_en, dam: horse.dam, damJp: horse.dam, damEn: 'Custom Dam' };
    assert.deepEqual(resolvePedigreeFields(horse, partial), expectedPartial);
    assert.deepEqual(batchResolve(horse, partial), expectedPartial);
});

test('名前の記号・日本語・空白も入力どおり保持する', () => {
    for (const name of ["King's Best (USA)", 'Sea The Stars', '  Frankel  ', '入力した日本語表記']) {
        const values = { sireJp: name, sireEn: name, damJp: name, damEn: name };
        for (const read of [resolvePedigreeFields, batchResolve]) {
            assert.ok(Object.values(read(horse, values)).every(value => value === name));
        }
    }
});

test('マスター欠損・既存の旧形式の下書きでも表記を失わない', () => {
    assert.deepEqual(resolvePedigreeFields(null, saved), expected);
    const legacy = resolvePedigreeFields(horse, { sire: 'Legacy Sire', dam: 'Legacy Dam' });
    assert.equal(legacy.sireJp, 'Legacy Sire');
    assert.equal(legacy.damJp, 'Legacy Dam');
    const empty = { sire: '', sire_en: '', dam: '', dam_en: '' };
    assert.ok(Object.values(resolvePedigreeFields(null, {})).every(value => value === ''));
    assert.ok(Object.values(batchResolve(empty, {})).every(value => value === ''));
});

test('マスター更新の完了・失敗にかかわらず保存表記と一括/単票が一致する', () => {
    for (const master of [horse, { ...horse, sire: saved.sireJp, dam: saved.damJp }, { ...horse, sire: '後日訂正した父', dam: '後日訂正した母' }]) {
        assert.deepEqual(resolvePedigreeFields(master, saved), expected);
        assert.deepEqual(batchResolve(master, saved), expected);
    }
});

test('読込で元データを変更せず、新規レポートはマスターから補完する', () => {
    const input = Object.freeze({ ...saved });
    const master = Object.freeze({ ...horse });
    resolvePedigreeFields(master, input);
    batchResolve(master, input);
    assert.deepEqual(input, saved);
    const defaults = { sire: horse.sire, sireJp: horse.sire, sireEn: horse.sire_en, dam: horse.dam, damJp: horse.dam, damEn: horse.dam_en };
    assert.deepEqual(resolvePedigreeFields(horse), defaults);
    assert.deepEqual(batchResolve(horse, {}), defaults);
});
