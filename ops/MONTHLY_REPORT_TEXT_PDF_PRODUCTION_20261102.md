# 月次PDF文字欠け修正の本番反映（2026-11-02）

## 承認と範囲

- ユーザーが既存修正の統合・本番反映・本番確認を明示承認した。Mac実機確認はデプロイ前Gateにしない。不具合が報告された場合は追加修正より旧revisionへの復旧を優先する。
- Astra OSの `risk_policy.approval_required` の `commit_or_push` / `deploy` は上記の明示指示を根拠とする。認証の更新はユーザーが実施した。本作業では認証情報・Astra設定・Registry・schedulerを変更しない。
- 既存 `monthly-report-pdf` 作業ツリーを使用する。新しいProject・Work・Codexセッション・作業ツリーを作成しない。
- 対象はHamagikuのGitHub `main` → Cloudflare Pages `hamagiku-reportapp`。Shinba、DB、認証、APIコード、Cloudflare設定は変更しない。
- 元チェックアウトの未追跡 `frontend/Dockerfile` / `frontend/cloudbuild.yaml` は維持し、統合に含めない。

## 公開前の復旧点（APIで照合済み）

| 対象 | 値 |
| --- | --- |
| Cloudflare Account | `06f3ed7e04359a30bc61d3eb553a2f6c` |
| Pages Production / canonical | `d287a2ae-bc5a-42d5-bdbf-812e43c079f6` |
| 旧本番ソース / origin/main | `fb322b0bdb25259ce8829cb307dea004aa1f538e` |
| 旧revisionの固定URL | `https://d287a2ae.hamagiku-reportapp.pages.dev` |
| 公開URL | `https://hamagiku-reportapp.pages.dev` |
| 復旧用タグ | `hamagiku-before-20261102-monthly-text-pdf`（上記旧ソースへ固定し、main push前にremote保存） |
| Cloud Run稼働版 | `hamagikureoprtapp2-00362-vg4` に100%、Ready true |
| Cloud Run最新作成版 | `hamagikureoprtapp2-00369-tc2`（稼働トラフィックとは区別） |

- canonicalは記録上の復旧先と一致し、Production / main / deploy successであることをPages APIから再確認した。OAuthのPages write権限とプロジェクトへの読取りアクセスも確認した。
- ビルド設定はroot `frontend`、command `npx @cloudflare/next-on-pages@1`、output `.vercel/output/static`。production branchは `main`、compatibility dateは `2024-09-23`、flagは `nodejs_compat`。
- 環境変数名は `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`。値はCloudflareでマスクされるため記録しない。設定を変更せず、公開後も比較する。
- 認証を含まないスナップショットは元チェックアウトの `tmp/monthly-report-print-audit/release-20261102/before.json` / `api-before.json` に保存した。

## 最終検証と統合手順

- Windows Chrome/Edgeの既存実PDF48ケース・72ページ、DOM192条件、印刷待機テスト3件と本番ビルドを最終確認する。ビルドの既存lint警告は失敗と混同しない。
- 修正差分は [検証監査](MONTHLY_REPORT_TEXT_PDF_AUDIT_20261102.md) に記載した9ファイルと本記録のみ。従来の `window.print()` と配色・ロゴ・文字サイズ選択・A4余白を維持する。
- 既存作業ツリー上で修正をコミットし、`main` へ通常mergeで統合する。旧mainの境界ガードを通過させ、統合後のクリーン状態と差分範囲を確認する。通常の `git push origin main` で既存Git連携を使用し、push後にHEAD / origin/main一致と本番ガードを再確認する。
- Pagesの成功はProduction/mainの対象commitとcanonicalの切替で判定する。Preview成功だけを本番反映済みとは扱わない。
- 公開単票・一括ルート、配信JS/CSS、ロゴ、APIを読取り確認し、新しい折返しと印刷待機が実配信コードに含まれることを確認する。本番の保存・翻訳・テストデータ作成は行わない。

## 即時ロールバック

1. 不具合の報告または公開確認の重大な失敗時は、原因への実験的な追加修正を先行させない。
2. Pages `hamagiku-reportapp` → Deploymentsで旧Production `d287a2ae-bc5a-42d5-bdbf-812e43c079f6` を選択し、`Rollback to this deployment` を実行する。Previewや別プロジェクトは選ばない。
3. CLI復旧を用いる場合、準備済みの `tmp/monthly-report-print-audit/release-20261102/cloudflare-release.mjs rollback <今回の本番deployment-id>` を元チェックアウトから実行する。現行canonicalの一致と復旧先の成功を検査してから、固定先の `/deployments/d287a2ae-bc5a-42d5-bdbf-812e43c079f6/rollback` にPOSTする。トークンを出力・更新しない。
4. 公開URLと旧レポートJSへの復旧を再確認する。DB・APIトラフィックは巻き戻さない。
5. Gitも戻す必要がある場合、後続変更を確認した上で今回のmergeを `git revert -m 1 <merge-commit>` で取り消し、通常pushで同期する。reset / force push / rebaseは行わない。旧revisionへ戻した直後に新ソースを再公開しない。

[Cloudflare公式の復旧仕様](https://developers.cloudflare.com/pages/configuration/rollbacks/)では、成功したProductionデプロイを復旧先として使用できる。復旧操作の実行は不具合発生時のみとし、準備確認のための本番切替は行わない。

## クライアント確認

既存アカウントでログインし、MacのSafariとChromeで「ワイルドイントリーグの24」を含む単票・一括をPDF保存する。ロゴ有無、日本語/英語馬名、長い馬主名・父母名の欠け・罫線接触・写真の変形を確認する。新規アカウント発行や確認依頼の送信先追加は不要。

本記録の事前部分は公開成功を意味しない。実デプロイ結果・公開検証・クライアント確認待ちは、反映後に追記する。

## 本番反映結果

- 2026-11-02 **18:54:15 JST** にPagesのdeployが成功し、canonicalが旧revisionから今回のProductionへ切り替わった。
- 本番revision: **`767b5982-9256-42ad-84f7-2154fbbf8d69`**。
- 本番commit: **`12f02eb265d60738601c3b45c54df7a520d4cbd5`**。実装commitは `712ee52b01f774ecda8eb67d997d498df09a4cc7`。
- 公開URL: **https://hamagiku-reportapp.pages.dev**。
- 固定revision URL: https://767b5982.hamagiku-reportapp.pages.dev。
- 本番タグ `hamagiku-production-20261102-monthly-text-pdf` → `12f02eb` と、復旧タグ → `fb322b0` の両方をremoteで照合した。
- 既存のmain/Git連携を使用した1回の公開であり、CLIからの別方式のアップロードや設定変更は行っていない。
- 既存作業ツリーでmainへの統合前とpush後、公開確認後の本番境界ガードが成功した。main / origin/main / 本番commitの一致、クリーン状態を確認した。

### 検証結果と限界

| 確認 | 結果 |
| --- | --- |
| 最終の既存実PDF再検査 | Chrome24ケース36ページ＋Edge24ケース36ページ、計48ケース72ページ、失敗0 |
| 最終DOM再検査 | Chrome96条件＋Edge96条件、計192条件、失敗0 |
| 印刷待機テスト | 3/3成功。統合後にも成功 |
| 本番ビルド | 成功。既存lint警告あり。検証時のダミー設定は公開物へ混入していない |
| 本番公開ルート | root・login・単票・一括の4ルートがHTTP 200 |
| ルートが参照するJS/CSS | 20/20でHTTP 200、Content-Typeも正常 |
| 配信コード | 単票/一括でgrid欄幅・折返し・写真の縮小防止、一括の準備待機とnowrap除去を確認 |
| 公開ブラウザ確認 | 未認証の単票/一括ルートから正常なログイン画面へ遷移。JavaScript実行時エラー0 |
| ロゴ・データ接続先 | ロゴSHA-256は旧版と同一。公開JSのDB/API接続先も旧版と一致 |
| Pages設定 | build/root/output、production branch、compatibility設定、環境変数名・型が一致。秘密値はAPIでマスクされるため直接比較していない |
| 既存API | HTTP 200 / `Multilingual Report API`。`00362-vg4`へ100%、Ready trueを維持 |
| Git復旧可能性 | 統合差分の逆適用 `--check` 成功。実際のrevertや本番切替は行っていない |

公開コード照合の初回にはJSONの未定義フィールド、CSS圧縮・ベンダー接頭辞による検査側の不一致があった。実出力を照合して検査条件を補正し、すべて通過した。アプリの追加修正や再デプロイは行っていない。

認証後の本番データを使った単票・一括PDFはこの実行環境では未確認であり、未認証ルートの確認を実帳票出力済みとは扱わない。Mac実機のSafari/Chromeもクライアント確認待ち。ローカル実PDF検査と公開配信コードの確認は、この限界と区別する。本番データの保存・翻訳・テストレコード作成は行っていない。

今回の反映ではDB、認証、API、依存関係、Cloudflare/GCP設定のコード差分はない。統合に含まれた前回体重グラフ監査の追記14行は既存ブランチの記録であり、アプリコードの追加変更ではない。

### 今回のrevisionから即時復旧するコマンド

元チェックアウト `C:/Users/jkhor/Desktop/アプリ開発/MultilingualReportApp_main` で実行する。

```powershell
node tmp/monthly-report-print-audit/release-20261102/cloudflare-release.mjs rollback 767b5982-9256-42ad-84f7-2154fbbf8d69
```

復旧先は **`d287a2ae-bc5a-42d5-bdbf-812e43c079f6` / `fb322b0`** に固定されている。後続revisionへ変わっていた場合は無条件に切り替えず停止する。Git側の正式な取り消し対象は `git revert -m 1 12f02eb265d60738601c3b45c54df7a520d4cbd5`。後続変更と承認範囲を確認し、通常の本番手順で同期する。

本番ソースを監査記録だけで再公開しないよう、公開後の記録は同じ既存作業ツリーの監査ブランチへ保存する。公開済みmainと本番タグは `12f02eb` のまま維持する。
