const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStatusFidelityRepairPrompt,
  buildStatusSystemInstruction,
  hasValidStatusDraft,
  normalizeStatusNarrative,
  normalizeStatusResponse,
} = require('./report_generation_service');

test('status narrative normalization preserves numbered headings and named procedures', () => {
  const normalized = normalizeStatusNarrative(`
    **1．診断麻酔**
    Low palmar nerve blockでは改善が認められませんでした。

    **2．追加の診断麻酔**
    High palmar nerve blockでも改善が認められませんでした。
  `);

  assert.match(normalized, /^1．診断麻酔/m);
  assert.match(normalized, /^2．追加の診断麻酔/m);
  assert.match(normalized, /Low palmar nerve block/);
  assert.match(normalized, /High palmar nerve block/);
});

test('status fidelity repair checks multilingual anatomical detail and each block result', () => {
  const prompt = buildStatusFidelityRepairPrompt({
    notes: 'Low palmar nerve block（球節以下） followed by High palmar nerve block（管以下）.',
    draft: {
      ja: { report: '1．診断麻酔\nLow palmar nerve blockとHigh palmar nerve blockを実施。' },
      en: { report: '1. Diagnostic blocks\nBoth blocks were performed.' },
    },
    terminologyGuard: '',
    translationRuleContext: '',
  });

  assert.match(prompt, /all languages in the source notes as one evidence set/i);
  assert.match(prompt, /For every diagnostic nerve block, use a separate sentence/i);
  assert.match(prompt, /source-described anatomical region or level/i);
  assert.match(prompt, /that block's own result/i);
});

test('status response can migrate the previous four-field response into one narrative', () => {
  const legacyDraft = {
    ja: {
      assessment: '跛行が続いています。',
      management: '診断麻酔を行いました。',
      nextSteps: '追加診断を待っています。',
      comment: '',
    },
    en: {
      assessment: 'Lameness persists.',
      management: 'Diagnostic nerve blocks were performed.',
      nextSteps: 'Further advice is pending.',
      comment: '',
    },
  };
  const normalized = normalizeStatusResponse(legacyDraft);

  assert.equal(hasValidStatusDraft(legacyDraft), true);
  assert.match(normalized.ja.report, /^1．現在の状態/m);
  assert.match(normalized.ja.report, /^3．今後の方針/m);
  assert.match(normalized.en.report, /^1\. Current condition/m);
  assert.match(normalized.en.report, /^3\. Next steps/m);
});

test('status prompt requires correction precedence and procedure-level fidelity', () => {
  const prompt = buildStatusSystemInstruction();

  assert.match(prompt, /later sentence explicitly corrects or clarifies/i);
  assert.match(prompt, /Low palmar nerve block/);
  assert.match(prompt, /High palmar nerve block/);
  assert.match(prompt, /not interchangeable/i);
  assert.match(prompt, /There is no 1-2 sentence limit/);
  assert.match(prompt, /one continuous report/i);
});
