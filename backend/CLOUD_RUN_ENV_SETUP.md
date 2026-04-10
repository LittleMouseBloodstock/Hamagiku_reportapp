# MultilingualReportApp_main Cloud Run Env Setup

更新日: 2026-04-10

目的:
- `feature/rag-migration-phase1` の semantic RAG を本番適用する前に、Cloud Run backend へ必要 env を安全投入する

前提:
- UI は変更しない
- 先に branch 上の eval を確認する
- `main` へ戻せる状態を維持する

---

## 必須 env

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_EMBEDDING_DIMENSIONS`

推奨値:

- `GEMINI_EMBEDDING_MODEL=gemini-embedding-001`
- `GEMINI_EMBEDDING_DIMENSIONS=1536`

---

## 適用順

1. expanded eval を pass させる
2. `semantic_rag.sql` を Supabase SQL Editor で適用
3. backend service に env を投入
4. `backfill_semantic_embeddings.js` を実行
5. 再度 eval / spot check
6. その後に deploy または traffic 切替

---

## Cloud Run 反映メモ

Cloud Run 側で backend service に以下を設定する:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_EMBEDDING_MODEL`
- `GEMINI_EMBEDDING_DIMENSIONS`

注意:

- `SUPABASE_SERVICE_ROLE_KEY` は frontend に渡さない
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` では代替できない
- backend のみで参照する

---

## 実行前チェック

- branch: `feature/rag-migration-phase1`
- fixed commits:
  - `a5b523b`
  - `bfd2f82`
  - `09f8eec`
  - `73aa4a5`
  - `5e9982a`
  - `3045b16`
  - `a6af8d4`

---

## バックアウト原則

1. 先に app revision を戻す
2. DB は残してよい構成を維持する
3. `semantic_rag.sql` を入れても app code が戻れば致命傷にならない前提で進める
