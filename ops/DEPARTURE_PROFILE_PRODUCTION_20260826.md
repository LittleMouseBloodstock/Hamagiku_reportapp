# 退厩レポート：馬情報集約・共通フォント版の本番反映記録

実施日: 2026-08-26（JST）

## 承認と変更範囲

- ユーザー指示: 「本番まで反映してみてください。戻れるように」。Mac実機未確認の制約を説明したうえで、Windows検証済み版の本番反映を進める。
- 対象はHamagikuの `main` / Cloudflare Pages `hamagiku-reportapp` / `https://hamagiku-reportapp.pages.dev/` のみ。Shinbaの環境は変更しない。
- アプリ本体の差分は `frontend/components/DepartureReportTemplate.tsx` のみ。馬名直下に性齢・父母をまとめ、帳票全体に既存の配信Notoフォントを継承する。長名の折り返しと日英標準量の1ページ出力を調整済み。
- 保存・翻訳・認証・DB・API処理・ビルド設定に変更なし。既存の未追跡 `frontend/Dockerfile` と `frontend/cloudbuild.yaml` はコミットしない。
- 実装 `dd7a521`、Windows監査 `a5e6d2b`、記録 `6859ed0`。帳票本体SHA-256: `67bd8dcddab3f2230573d051f51be8e4e414754f9351ce285f40c8dcf69b7623`。
- 本記録の事前部分は公開成功を意味しない。公開後の実デプロイ・配信コード・復旧タグを確認し、結果を別節に追記する。

## 公開前の復旧点と現状

2026-08-26 19:55–20:00 JSTの読み取り専用確認:

| 対象 | 反映前の値 |
| --- | --- |
| リモートmain・ローカルmain | `d16bcccc9af1df5eb34bfb3ae1897f437758a3ae` |
| 既存の本番タグ | `hamagiku-production-20260826-departure-insets` → `d16bccc` |
| 今回の反映前専用タグ（リモート保存を反映の前提とする） | `hamagiku-before-20260826-departure-profile` → `d16bccc` |
| Pages本番デプロイ | `9f6451c2-b9fa-4e3c-b18f-aed09930d482`、source `d16bccc` |
| 旧公開版URL | `https://9f6451c2.hamagiku-reportapp.pages.dev` |
| 旧レポートJS | `/_next/static/chunks/app/reports/%5Bid%5D/page-63519183c0523346.js` |
| APIサービス | Google project `first-api-spread` / `asia-northeast1` / `hamagikureoprtapp2` |
| API稼働版・トラフィック | `hamagikureoprtapp2-00362-vg4` に100%、Ready true |
| API最新作成版（稼働版ではない） | `hamagikureoprtapp2-00367-wmr` |

- 公開 `/reports/new` はHTTP 200。旧JSに新しい `departure-sex-age` がなく、旧3列の指定が残ることを確認。本番がまだ変更前であることを実配信コードでも照合した。
- 既存の復旧タグと成功済み本番デプロイは削除しない。過去のプレビューデプロイを即時復旧先にはしない。
- 実装だけの逆差分を生成して `git apply --check --reverse` に成功。これは適用可能性の検査だけであり、ファイルを戻したわけではない。生成物は `tmp/departure-print-audit/departure-profile-production-change.patch` に保持。

## 検証済み内容・残る制約

- Windows Chrome / Edgeで各30条件、合計60/60合格・84ページ。本番用ビルドも成功。今回の反映直前に帳票コードのハッシュと保存済み結果を再照合した。
- 公開前の独立した読み取り専用監査でも、アプリ本体差分1ファイル、保存・翻訳・DB・他帳票の差分なし、60条件の結果と84ページの記録の一致を再確認した。
- 生成manifestの `sourceRef` は `working-tree` であり、結果自体にコミットIDが直接固定されているわけではない。帳票本体が監査済み `a5e6d2b` と同一blobであることと、上記SHA-256を別途照合して公開対象を特定した。
- 日英の標準・短文・長名・欠損値・母のみは1ページ。本文15px、用紙内側の上下12mm・左右15mm、挨拶とフッターの一体性を維持。
- 入力欄・プレビュー・PDFで「馬名 → 性齢 → 父母 → 馬主・調教師」。紙下端の白い余白と外側の濃いグレーもWindows画面検証済み。
- MacのChrome/Safari、実プリンター、フォント通信遮断時は未確認。Mac確認は公開後も未完了として管理する。
- 任意の長文を1ページへ縮小しない。24段落の英語では挨拶・フッターの一体ブロックが3ページ目に送られる制約が残る。
- 本番で実データの保存・翻訳テストは行わない。公開確認は読み取り専用とする。

## 本番反映・公開確認の手順

1. 今回の反映前専用タグを旧本番コミットへ付け、リモートに保存できたことを確認する。
2. 既存ユーザー作業に触れない専用のクリーンなmain作業ツリーを作成し、`scripts/guard-production-deploy.ps1 -Target hamagiku` で旧本番と対象境界を確認する。
3. 検証済みブランチをfast-forwardのみで統合し、対象コミット・クリーン状態・差分範囲を再確認する。通常のmainへのpushで既存のGit連携を使う。強制pushや履歴改変は行わない。
4. push後、HEADとorigin/mainの一致を含む本番ガードを再実行する。CloudflareのProduction/mainで対象コミットのデプロイを照合する。
5. 本番URLから取得し直したレポートJSの新しい性齢ブロック、フォント継承、2列の宛名、A4余白と挨拶文を確認する。対象の公開アセットが取得できることも確認する。
6. APIの既存稼働・トラフィックを読み取り専用で再確認する。APIの再デプロイ・設定変更は手動では行わない。既存の自動連携の結果と本変更の成功判定を混同しない。
7. 成功後、対象コミットへ `hamagiku-production-20260826-departure-profile` を付けてリモート保存する。結果の追記だけで不要な再公開を起こさないよう、公開後の監査記録は検証ブランチで保存してよい。

## 復旧手順

即時復旧:

1. Cloudflareの `hamagiku-reportapp` → Deployments → All deploymentsを開く。
2. 旧本番 `9f6451c2-b9fa-4e3c-b18f-aed09930d482`（source `d16bccc`）を選び、`Rollback to this deployment` で本番へ戻す。別プロジェクトやPreviewは選ばない。
3. 本番URLの表示と旧レポートJSを再確認する。DBやAPIのトラフィックは変更しない。

Git上でも戻した状態を維持する場合:

1. 最新mainから復旧用ブランチを作り、後続の変更がないか確認する。mainをresetしたり強制pushしたりしない。
2. 旧本番 `d16bccc` と実装 `dd7a521` の間から、`frontend/components/DepartureReportTemplate.tsx` だけの差分を生成する。
3. 逆適用の `--check` を通し、競合がなければその帳票差分だけを取り消して新しいコミットにする。後続変更がある場合は自動で上書きしない。
4. 復旧後のビルドと本番境界を確認し、通常の公開手順でmainへ反映する。Pagesだけ戻した後に、新版mainの自動再公開で戻されないようGit上の状態も合わせる。

このリリースはデータ形式を変えない。復旧のために現在の利用データを過去へ巻き戻す必要はなく、その操作は実施しない。

参考: [Cloudflare Pagesのロールバック手順](https://developers.cloudflare.com/pages/configuration/rollbacks/)
