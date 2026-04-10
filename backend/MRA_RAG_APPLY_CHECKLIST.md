# MultilingualReportApp_main RAG Apply Checklist

更新日: 2026-04-09

目的:
- `feature/rag-migration-phase1` の backend-only RAG 改修を、本番稼働中の `MultilingualReportApp_main` に安全適用する

前提:
- UI は変更しない
- 先に branch 上で eval を回す
- いきなり `main` へ戻さない

---

## 1. 現在の branch 固定点

- branch: `feature/rag-migration-phase1`
- commit: `a5b523b` safer generation skeleton
- commit: `bfd2f82` eval baseline
- commit: `09f8eec` expanded fixed cases
- commit: `73aa4a5` semantic scaffolding

---

## 2. 本番前に必要な env

`backend/.env` または Cloud Run env に以下が必要:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_EMBEDDING_MODEL` (`gemini-embedding-001` 推奨)
- `GEMINI_EMBEDDING_DIMENSIONS` (`1536` 推奨)

注意:
- semantic retrieval / backfill は `SUPABASE_SERVICE_ROLE_KEY` が無いと動かない
- frontend の anon key では代替できない
- backend code は `SUPABASE_SERVICE_ROLE_KEY` を優先し、互換のため `SUPABASE_SERVICE_ROLE` も読む

---

## 3. 先にやること

1. expanded eval を quota 回復後に再実行
2. 結果 JSON を保存
3. `main` との差分を再確認

実行:

```bash
cd backend
node run_report_eval.js
```

日次 quota に当たる場合の分割実行:

```powershell
cd backend
.\run_report_eval_incremental.ps1 -OutputPath .\evals\results\report-eval-incremental.json -Offset 0 -Limit 2
.\run_report_eval_incremental.ps1 -OutputPath .\evals\results\report-eval-incremental.json -Offset 2 -Limit 2
.\run_report_eval_incremental.ps1 -OutputPath .\evals\results\report-eval-incremental.json -Offset 4 -Limit 2
.\run_report_eval_incremental.ps1 -OutputPath .\evals\results\report-eval-incremental.json -Offset 6 -Limit 2
```

補足:

- `run_report_eval.js` は `--append-to` に対応済み
- 既に保存済みの case id は skip される
- free-tier quota で 8 件一括が厳しい場合は 2 件ずつ積む

直近の基準結果:

- `backend/evals/results/report-eval-2026-04-09T12-43-59-035Z.json`
  - 初期 3 ケースは PASS
- expanded 8 ケースは code/alias 調整後の最終再実行が Gemini quota 待ち

---

## 4. DB 適用順

1. `semantic_rag.sql` を Supabase SQL Editor で適用
2. 必要なら `domain_knowledge` へ seed を投入
3. `backfill_semantic_embeddings.js` を実行

実行:

```bash
cd backend
node backfill_semantic_embeddings.js --scope=all --limit=100
```

---

## 5. バックアウト

もし問題が出た場合:

1. app code は `main` に戻す
2. Cloud Run は直前 revision に traffic を戻す
3. semantic table / function は残しても app が壊れない構成にしてある

原則:
- 先に app を戻す
- DB rollback は最後

---

## 6. deploy 前チェック

- `node --check backend/index.js`
- `node --check backend/report_generation_service.js`
- `node --check backend/run_report_eval.js`
- expanded eval が許容結果
- `git status` が意図した差分だけ

---

## 7. 次の実作業

1. quota 回復後に expanded eval 再実行
2. pass なら service role を backend env に追加
3. `semantic_rag.sql` 適用
4. embedding backfill
5. その後 deploy 判断

deploy 判断条件:

- expanded eval が許容結果
- `git status` が意図した差分だけ
- rollback 先 branch / commit が明示されている
- Cloud Run env に `SUPABASE_SERVICE_ROLE_KEY` を安全投入できる
