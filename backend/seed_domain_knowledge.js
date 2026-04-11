require('dotenv').config();
const { createSupabaseAdminClient } = require('./supabase_admin');

const SEED_GROUP = 'mra-phase1-domain-knowledge';

const seeds = [
  {
    category: 'monthly_report_style',
    language: 'ja',
    title: '月次レポート: 馬主体の近況文体',
    content: [
      '馬主向け月次レポートは、事実、現在の状態、今後の方針を簡潔に書く。',
      '診断名や投薬内容は、入力に明示されていない限り追加しない。',
      '痛みや跛行などの表現は断定しすぎず、「違和感が見られる」「経過を見ている」程度に留める。',
      '前向きな内容でも、過度な期待表現やレース結果の予測は避ける。',
    ].join('\n'),
  },
  {
    category: 'monthly_report_style',
    language: 'en',
    title: 'Monthly report: owner-facing tone',
    content: [
      'Monthly owner updates should be concise, factual, and calm.',
      'State the current condition, what has been done, and the next plan without over-interpreting farm notes.',
      'Do not add diagnoses, medication, or veterinary conclusions unless they are explicitly provided.',
      'Use natural owner-facing English rather than literal translation.',
    ].join('\n'),
  },
  {
    category: 'terminology',
    language: 'ja',
    title: '脚元・治療メモの扱い',
    content: [
      '牧場側の獣医共有メモは、獣医師本人のカルテではなく、牧場が受けた説明や経過の備忘録として扱う。',
      'レポート本文には強く混ぜすぎず、必要な場合だけ軽く触れる。',
      '画像や検査結果がある場合は、本文で詳細に説明しすぎず、別記として添付する方が安全。',
    ].join('\n'),
  },
  {
    category: 'terminology',
    language: 'en',
    title: 'Handling farm-side vet notes',
    content: [
      'Farm-side vet notes are not a veterinary medical chart. Treat them as the farm’s memo of what was explained and observed.',
      'Do not over-emphasize these notes in the monthly body unless the user specifically asks for it.',
      'When images or supporting material exist, keep the body concise and present details as an appendix where appropriate.',
    ].join('\n'),
  },
  {
    category: 'departure_report',
    language: 'ja',
    title: '退厩時レポートの構成',
    content: [
      '退厩時レポートは、退厩日、馬の基本情報、馬体重、飼葉、運動、装蹄、駆虫、コメントを簡潔にまとめる。',
      '月次レポートよりも引き継ぎ・最終状態の説明を重視する。',
      '未入力項目は無理に補完せず、空欄または簡潔な未記載扱いにする。',
    ].join('\n'),
  },
  {
    category: 'departure_report',
    language: 'en',
    title: 'Departure report structure',
    content: [
      'A departure report should summarize the departure date, basic horse profile, weight, feeding, exercise, farrier, worming, and final comments.',
      'It should focus on handover and current condition rather than a full monthly narrative.',
      'Do not invent missing fields. Leave them blank or keep them neutral if not provided.',
    ].join('\n'),
  },
  {
    category: 'equine_terms',
    language: 'en',
    title: 'Common equine wording preferences',
    content: [
      'Use "bucked shins" only when the source clearly refers to sore shins or ソエ.',
      'Use "splints" only when the source explicitly refers to splints, not as a generic leg issue.',
      'Use "settled" or "comfortable" for mild recovery context when appropriate.',
      'Avoid "completely recovered" unless the source clearly states it.',
    ].join('\n'),
  },
  {
    category: 'equine_terms',
    language: 'ja',
    title: '競走馬向け表現の注意',
    content: [
      '「順調」「良好」は使えるが、状態が不明な場合に過度に前向きな表現へ寄せない。',
      '「問題ありません」は、検査や経過で明確な根拠がある場合に使う。',
      '脚元や治療の記述は、牧場メモの範囲を超えて専門的に断定しない。',
    ].join('\n'),
  },
];

async function main() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase admin environment variables are not configured.');
  }

  const { data: existing, error: selectError } = await supabase
    .from('domain_knowledge')
    .select('id, title, language, category, metadata')
    .contains('metadata', { seed_group: SEED_GROUP });
  if (selectError) throw selectError;

  const existingByKey = new Map(
    (existing || []).map((item) => [`${item.language}:${item.category}:${item.title}`, item.id])
  );

  let inserted = 0;
  let updated = 0;

  for (const seed of seeds) {
    const key = `${seed.language}:${seed.category}:${seed.title}`;
    const payload = {
      workspace_id: null,
      category: seed.category,
      title: seed.title,
      content: seed.content,
      language: seed.language,
      metadata: { seed_group: SEED_GROUP },
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const id = existingByKey.get(key);
    if (id) {
      const { error } = await supabase.from('domain_knowledge').update(payload).eq('id', id);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await supabase.from('domain_knowledge').insert(payload);
      if (error) throw error;
      inserted += 1;
    }
  }

  console.log(JSON.stringify({ seed_group: SEED_GROUP, inserted, updated, total: seeds.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
