# Cloudflare Pages Env Setup

更新日: 2026-04-10

目的:
- `hamagiku-reportapp` の Cloudflare Pages build を安定させる
- preview / production ともに `Missing Supabase URL or Anon Key` で落ちない状態にする

## 必須 env

Cloudflare Pages の `Production` と `Preview` の両方に以下を設定する。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_DEMO_MODE`

## 推奨値

- `NEXT_PUBLIC_DEMO_MODE=false`
- `NEXT_PUBLIC_API_URL=https://hamagikureoprtapp2-248106009661.asia-northeast1.run.app`

補足:
- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` は、ローカル `frontend/.env.local` の本番値と一致させる
- `NEXT_PUBLIC_API_URL` を入れないと frontend は `http://localhost:8080` にフォールバックする
- Pages build log に `Build environment variables: (none found)` と出る状態は未設定

## 設定場所

Cloudflare Dashboard:

1. `Workers & Pages`
2. `hamagiku-reportapp`
3. `Settings`
4. `Variables and Secrets`
5. `Production` と `Preview` の両方に追加

## 確認方法

設定後に再 deploy して、build log で以下を確認する。

- `Build environment variables: (none found)` が消える
- `Missing Supabase URL or Anon Key` が消える
- `npm run build` が最後まで通る
