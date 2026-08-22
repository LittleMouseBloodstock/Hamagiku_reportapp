# Supabase Free Plan keepalive 運用

対象は、2026年8月21日時点で同一Supabase組織に存在するFree Plan
プロジェクト全2件です。プロジェクト追加時はworkflowのmatrixと本表を
同時に更新します。

| アプリ | project ref | 状態 |
| --- | --- | --- |
| Hamagiku / MultilingualReport | `srhthxknehzofuzjjrhh` | 対象 |
| Shinba Report | `qlebmpirqfkhierfjqxv` | 対象 |

## 方式

GitHub Actionsが毎日09:17・21:17（Asia/Tokyo）に、各DBの
`public.keepalive_ping()`を通常1回呼びます。一時的なネットワーク障害や
HTTP 408・425・429・5xxでは、最大3回まで再試行します。このRPCは固定文字列
`ok`を返すだけで、業務テーブルのSELECT・INSERT・UPDATE・DELETEは行いません。

実行スクリプトは次の条件を満たさない設定を拒否します。

- URLが`https://<project-ref>.supabase.co`と完全一致すること
- 鍵がmodern publishable key（`sb_publishable_...`）であること
- 呼び出し先が`/rest/v1/rpc/keepalive_ping`であること

`sb_secret_...`、legacy JWT、`service_role`はkeepaliveで使用禁止です。
レスポンス本文と鍵はログへ出力しません。

## DBマイグレーション

適用先を間違えないでください。各プロジェクト固有のマイグレーションには
スキーマpreflightがあり、不一致時は変更前に失敗します。

先に本リポジトリの認証付きREST変更を本番へデプロイし、既存ユーザーで
ログイン・一覧取得・更新を確認してからDBマイグレーションを適用します。
旧フロントエンドには一部でanon tokenへフォールバックする経路があるため、
DBを先に強化すると該当画面が一時的に利用できなくなります。

1. 両プロジェクト:
   `20260821044621_harden_supabase_keepalive.sql`
2. Hamagikuのみ:
   `20260821045524_harden_hamagiku_rls.sql`
3. Shinbaのみ:
   `20260821045533_harden_shinba_function_privileges.sql`

Hamagikuでは、匿名アクセスおよび「任意のauthenticatedユーザー」の業務
データアクセスを廃止し、`allowed_users`と実際のAuthユーザーが一致する場合
だけRLSを通します。`allowed_users`の変更はadminだけに限定し、最後のadminを
削除・降格できないようにしています。現在のHamagikuは単一組織運用のため、
allowlist内のadmin・manager・staffは業務テーブル全体を共同利用します。

Shinbaでは、workspace用SECURITY DEFINER関数をData API非公開の`private`
schemaへ移し、公開側はSECURITY INVOKERラッパーにします。プロビジョニング
関数は匿名・一般認証ユーザーから実行できません。その他のRPCも固定
`search_path`と明示ACLを使います。両プロジェクトとも、匿名RLSポリシーだけ
でなくpublic/anonのテーブルACLも明示的に失効させます。

## GitHub Actions Secrets

リポジトリのActions secretsへ次の2件を登録します。

- `SUPABASE_HAMAGIKU_PUBLISHABLE_KEY`
- `SUPABASE_SHINBA_PUBLISHABLE_KEY`

Supabase Dashboardの**Publishable and secret API keys**にある、有効な
publishable keyだけを登録してください。値をソース、Issue、PR、ログへ
貼り付けないでください。Secret名に`KEY`とあっても、server secret keyや
service-role JWTを登録してはいけません。

## 検証

ローカルの安全性テスト:

```powershell
node --check scripts/supabase-keepalive.mjs
node --test scripts/supabase-keepalive.test.mjs
```

本番反映後はActionsの`Supabase keepalive`を手動実行し、2つのmatrix jobが
それぞれ`HTTP 200`になることを確認します。失敗時もレスポンス本文はログへ
出ません。

## 運用上の限界

- GitHubのscheduled workflowは混雑時に遅延することがあります。そのため
  正時を避け、1日2回にしています。
- public repositoryでは、リポジトリ活動が60日ないとscheduled workflowが
  自動無効化されることがあります。週次監視でworkflowの最終成功時刻と
  有効状態を確認してください。
- Free Planのpause回避はベストエフォートです。pauseされないことを契約上
  保証できるのは有料プランです。

## 鍵の運用

- フロントエンド: modern publishable key
- Cloud Run等の管理バックエンド: コンポーネント別modern secret key
- legacy `anon` / `service_role` JWT: 移行後に無効化
- ローカル`.env`: Git管理対象外。漏えいが疑われた場合は即時ローテーション

ローテーションは、新鍵作成 → Secret Managerへ新version追加 → 新Cloud Run
revisionで疎通確認 → 旧鍵無効化、の順で行います。
