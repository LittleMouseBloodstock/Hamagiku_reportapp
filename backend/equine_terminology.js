const BASE_GUARD_LINES = [
  '- Do not invent a diagnosis or treatment detail that is not present in the input.',
  '- Keep the tone suitable for owner-facing racehorse farm reporting.',
  '- If the source only says soreness, discomfort, cooling, shockwave, x-ray, or follow-up, do not escalate it into a stronger diagnosis.',
  '- If the source says there was no fracture or no major issue, preserve that caution in both Japanese and English.',
];

const TERMINOLOGY_RULES = [
  {
    match: /(ソエ|splints?)/i,
    line: '- Treat ソエ / splints conservatively. Prefer "shin soreness" or "splints" only when clearly stated. Do not jump to suspensory ligament injury.',
  },
  {
    match: /(レントゲン|x-?ray)/i,
    line: '- When x-rays are mentioned, report only what the source says. Do not imply findings beyond the source.',
  },
  {
    match: /(エコー|ultrasound)/i,
    line: '- When ultrasound is mentioned, keep the wording factual and avoid adding diagnosis details that were not given.',
  },
  {
    match: /(ショックウェーブ|shock ?wave)/i,
    line: '- If shockwave treatment is mentioned, describe it as ongoing care only. Do not overstate severity.',
  },
  {
    match: /(骨に問題がない|no fracture|no particular issues with the bone)/i,
    line: '- Preserve the reassuring wording around bone findings. Do not contradict it.',
  },
];

function buildBaseTerminologyGuard() {
  return BASE_GUARD_LINES.join('\n');
}

function buildRelevantTerminologyContext(inputText) {
  const text = String(inputText || '');
  return TERMINOLOGY_RULES
    .filter((rule) => rule.match.test(text))
    .map((rule) => rule.line)
    .join('\n');
}

module.exports = {
  buildBaseTerminologyGuard,
  buildRelevantTerminologyContext,
};
