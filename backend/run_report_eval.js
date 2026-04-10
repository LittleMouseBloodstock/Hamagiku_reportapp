require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateMonthlyReport, generateDepartureReport } = require('./report_generation_service');

function parseArgs(argv) {
  const options = {
    casesFile: path.join(__dirname, 'evals', 'report_generation_cases.json'),
    caseId: null,
    outputDir: path.join(__dirname, 'evals', 'results'),
    apiKey: process.env.GEMINI_API_KEY || null,
    offset: 0,
    limit: null,
    appendTo: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--cases=')) options.casesFile = arg.split('=')[1] || options.casesFile;
    if (arg.startsWith('--case=')) options.caseId = arg.split('=')[1] || null;
    if (arg.startsWith('--out=')) options.outputDir = arg.split('=')[1] || options.outputDir;
    if (arg.startsWith('--api-key=')) options.apiKey = arg.split('=')[1] || options.apiKey;
    if (arg.startsWith('--offset=')) options.offset = Number(arg.split('=')[1] || '0');
    if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1] || '0') || null;
    if (arg.startsWith('--append-to=')) options.appendTo = arg.split('=')[1] || null;
  }

  return options;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/[「」『』（）()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TERM_ALIASES = {
  '問題なし': ['問題なし', '問題は見られません', '問題はありません', '問題ありませんでした', '特に問題はない', '特段の問題がない'],
  'no': ['no', 'no issues', 'no significant issues', 'no particular issues'],
  condition: ['condition', 'filled out', 'filled out nicely', 'physique', 'overall condition'],
  'walking in hand': ['walking in hand', 'hand walking', 'hand-walking', 'walk in hand'],
  'follow-up': ['follow-up', 'follow up', 'following the recent treatment', 'following recent treatment', 'recent treatment'],
  variation: ['variation', 'fluctuations', 'day-to-day variation', 'variability', 'day-to-day basis', 'day to day', 'temperament on a day-to-day basis'],
  settled: ['settled', 'calm', 'calm during exercise', 'settling well', 'settled well'],
  manageable: ['manageable', 'manageability', 'no significant issues with their manageability', 'no significant issues with his handling', 'not particularly difficult to handle', 'easy to handle', 'difficulty in handling', 'handling him', 'difficult to manage', 'handling issues', 'handling challenges', 'handling'],
  movement: ['movement', 'gait', 'way of going', 'action', 'moves'],
  cooling: ['cooling', 'icing', 'post-exercise icing'],
  '気分の波': ['気分の波', '気分の浮き沈み', '気分に多少の波', '気分の変動', '気性の波', '気分の変動が見られる', '日によっては気分の変動', '日によっては気分の変動が見られる'],
  印象: ['印象', '面は見受けられません', '扱いにくい面', '気になることはございません', '感じることはありません', '感じる場面はございません', '感じることもなく', '感じることもありません', '感じられません', '目立つようなことはありません', '扱いにくい面はございません', '扱いにくい面はありません', '扱いにくさが強い印象はありません', '特に扱いにくい面はございません'],
  冷却: ['冷却', 'アイシング'],
};

function includesAll(text, tokens = []) {
  const normalized = normalize(text);
  return tokens.filter((token) => {
    const aliases = TERM_ALIASES[token] || [token];
    return !aliases.some((alias) => normalized.includes(normalize(alias)));
  });
}

function evaluateMonthly(result, expectations = {}) {
  return {
    jaMissing: includesAll(result.ja, expectations.jaMustInclude || []),
    enMissing: includesAll(result.en, expectations.enMustInclude || []),
    enForbidden: (expectations.enMustAvoid || []).filter((token) => normalize(result.en).includes(normalize(token))),
  };
}

function evaluateDeparture(result, expectations = {}) {
  const jaFields = expectations.jaFieldsMustInclude || {};
  const enFields = expectations.enFieldsMustInclude || {};
  const missing = [];

  for (const [field, tokens] of Object.entries(jaFields)) {
    const misses = includesAll(result?.ja?.[field], tokens);
    if (misses.length) missing.push(`ja.${field}: ${misses.join(', ')}`);
  }
  for (const [field, tokens] of Object.entries(enFields)) {
    const misses = includesAll(result?.en?.[field], tokens);
    if (misses.length) missing.push(`en.${field}: ${misses.join(', ')}`);
  }

  return { missing };
}

async function runCase(testCase, apiKey) {
  if (testCase.type === 'departure') {
    const output = await generateDepartureReport({ notes: testCase.notes, apiKey });
    return {
      id: testCase.id,
      type: testCase.type,
      output,
      evaluation: evaluateDeparture(output, testCase.expectations || {}),
    };
  }

  const output = await generateMonthlyReport({ prompt: testCase.prompt, apiKey });
  return {
    id: testCase.id,
    type: testCase.type,
    output,
    evaluation: evaluateMonthly(output, testCase.expectations || {}),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.apiKey) {
    throw new Error('Missing GEMINI_API_KEY or --api-key.');
  }

  const allCases = JSON.parse(fs.readFileSync(options.casesFile, 'utf8'));
  let cases = allCases.filter((testCase) => !options.caseId || testCase.id === options.caseId);
  if (options.offset > 0) {
    cases = cases.slice(options.offset);
  }
  if (options.limit) {
    cases = cases.slice(0, options.limit);
  }

  if (!cases.length) {
    throw new Error('No eval cases matched the current filter.');
  }

  fs.mkdirSync(options.outputDir, { recursive: true });
  let results = [];
  if (options.appendTo && fs.existsSync(options.appendTo)) {
    const existing = JSON.parse(fs.readFileSync(options.appendTo, 'utf8'));
    results = Array.isArray(existing?.results) ? existing.results : [];
  }
  for (const testCase of cases) {
    console.log(`Running ${testCase.id}...`);
    const alreadyExists = results.some((item) => item.id === testCase.id);
    if (alreadyExists) {
      console.log(`Skipping ${testCase.id} (already exists in append target)...`);
      continue;
    }
    results.push(await runCase(testCase, options.apiKey));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = options.appendTo || path.join(options.outputDir, `report-eval-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    offset: options.offset,
    limit: options.limit,
    results,
  }, null, 2));

  console.log(`Saved results to ${outputPath}`);

  for (const result of results) {
    if (result.type === 'departure') {
      const status = result.evaluation.missing.length === 0 ? 'PASS' : 'CHECK';
      console.log(`[${status}] ${result.id}`);
      if (result.evaluation.missing.length) {
        console.log(`  missing: ${result.evaluation.missing.join(' | ')}`);
      }
      continue;
    }

    const status = result.evaluation.jaMissing.length === 0
      && result.evaluation.enMissing.length === 0
      && result.evaluation.enForbidden.length === 0
      ? 'PASS'
      : 'CHECK';
    console.log(`[${status}] ${result.id}`);
    if (result.evaluation.jaMissing.length) console.log(`  ja missing: ${result.evaluation.jaMissing.join(', ')}`);
    if (result.evaluation.enMissing.length) console.log(`  en missing: ${result.evaluation.enMissing.join(', ')}`);
    if (result.evaluation.enForbidden.length) console.log(`  en forbidden: ${result.evaluation.enForbidden.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
