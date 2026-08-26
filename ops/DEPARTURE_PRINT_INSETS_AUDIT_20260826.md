# 退厩レポートの印刷位置修正・実PDF監査

実施日: 2026-08-26

## 対象・復旧点

- 対象は浜菊の退厩レポートの印刷CSSのみ。画面用レイアウト、翻訳、保存、認証、DB、他帳票は変更しない。
- 修正前の本番コミット: `747698d0c8650dcec75bae3d0d8433e8ac1b2dbd`
- リモート保存済みの復旧タグ: `hamagiku-production-20260826-departure-pagination`
- 修正前のCloudflare Pagesデプロイ: `f98c0479-c04b-43c7-859a-85284624040f`
- 作業ブランチ: `codex/departure-print-page-insets`
- 既存の未追跡ファイル `frontend/Dockerfile` / `frontend/cloudbuild.yaml` は変更・追加・退避しない。

## 不具合の再現と原因

印刷処理は現在の文書に対する `window.print()` であり、別HTMLへのコピーではない。退厩テンプレートは他帳票と条件分岐で切り替わる。

修正前は本文と親要素の幅が180mm、本文のpaddingが0で、上下左右の余白を専用の `@page` のみに依存していた。用紙側の余白が0になると、180mm幅の本文がA4の左端に寄る。

修正前のGit版を実コンポーネントとして描画し、用紙余白を0にするCSSを最後に適用した実PDFで、左0.00mm・右30.08mm・上1.37mmを計測した。提示画像と同種の左上へのずれを再現している。ユーザー端末の実際の印刷設定は取得しておらず、その設定自体を断定するものではない。

前回記録 `DEPARTURE_PRINT_PAGINATION_AUDIT_20260826.md` の検証は印刷CSSの画面描画寸法であり、実PDFの検査ではなかった。今回はその不足を補う。

## 修正

1. 専用用紙名 `hamagiku-departure` は保持し、用紙余白を0にする。用紙・親要素・帳票の幅を210mmで揃える。
2. 帳票本体をborder-boxとし、上下12mm・左右15mmのpaddingを持たせる。本文幅180mmと本文15pxは維持する。
3. `box-decoration-break: clone` により、長文の継続ページにも本体の余白を確保する。固定高さ・内容の切り取り・印刷全体の縮小は使用しない。
4. 実PDFで発見した「挨拶は2ページ目、フッターだけ3ページ目」の分断を修正する。印刷時の挨拶・フッターの親を幅100%のinline-blockにし、ブロック前の改ページを禁止しない。

## 実PDFの検証

WindowsのChrome `151.0.7922.174` とEdge `151.0.4129.107` でローカルHTMLを実際にPDF化した。通常ブラウザとは分離した検証専用プロファイルを使用し、認証セッション、実データ、DBには接続していない。

実アプリの `DepartureReportTemplate.tsx` と本番ビルド済み共通CSS・フォント・ロゴを使う。言語選択と通信だけを検証用に置き換え、通信関数は呼ばれた場合に失敗する。styled-jsxのCSSは子セレクターをエスケープせず静的HTMLに出す。検証用のアプリルートは追加しない。

| 条件 | Chrome | Edge |
| --- | --- | --- |
| 日本語 / 英語 × 画像相当・コメントなし × ロゴ有無 × 用紙余白設定2種 | 8/8合格・各1ページ | 8/8合格・各1ページ |
| 日本語 / 英語 × 2段落コメント・長い宛名 × ロゴ有無 × 用紙余白設定2種 | 8/8合格・各1ページ | 8/8合格・各1ページ |
| 日本語 / 英語 × 24段落コメント × ロゴ有無 × 用紙余白設定2種 | 8/8合格・各3ページ | 8/8合格・各3ページ |

用紙余白設定2種は、帳票既定CSSと、後段で用紙余白を0に上書きする条件。全48条件で以下を確認した。

- A4縦、空白ページなし、標準量は1ページ、固定の長文条件は3ページ以内。
- 全ページの文字が安全域内（左右14mm以上、上下11mm以上）。1ページ目の実測は左15.00mm・右15.08〜15.09mm・上13.28mm。
- 用紙余白設定を変えても位置・ページ数が変わらない。
- ChromeとEdgeの全24対応条件でページ数・文字の余白・本文サイズが一致。
- 本文15px相当の11.25pt、実フォントの読み込み完了、ロゴ設定とPDF内の画像有無が一致。
- 馬名・宛名・父母・ケア・飼葉・運動・コメント各段落の全文が存在。段落番号の欠落・重複なし。
- 挨拶文・署名・フッターが存在し、挨拶文とフッターは同じページに一度だけ表示。
- PDFをページ画像に変換し、日英の標準量、ロゴ有無、日英長文の全ページを目視確認。
- 修正前のGit版では同じ余白検査が失敗することを確認（不具合を見逃さない負例）。

検証基盤で判明した点も修正した。

- ビルド済みCSSの相対URLだけでなく `/_next/static/media/` 形式も実フォントへ解決する。フォールバックフォントでは合格にしない。
- この環境では可変フォントがPDF内でType3名になるため、フォント読み込み完了をメタデータでも確認する。
- PDFの描画順と読み順は異なる。列内の改行を保ったテキストブロックの座標順で、ページをまたぐ本文を検査する。
- Edgeの起動プロセスがPDF完成より早く終了するため、今回生成された非空PDFの書き込み完了を最大30秒まで確認する。古いPDFは合格にしない。
- 検証プロファイルは実行ごと・条件ごとに分離する。生成物はGit対象外の検証専用領域に限定する。

## 再検証の手順

前提: frontendの既存lockfileに従って依存をインストールし、本番ビルドを完了しておく。検証用esbuildはその既存依存を使う。

リポジトリ直下で実行する（Python/ブラウザのパスは環境に合わせる）。

```powershell
python -m pip install --target tmp/departure-print-audit/python -r scripts/requirements-departure-print-audit.txt
node scripts/departure-print-fixtures.mjs --label=chrome-check
.\scripts\render-departure-print-fixtures.ps1 -Label chrome-check
python -X utf8 scripts/verify-departure-print-pdfs.py --label chrome-check

node scripts/departure-print-fixtures.mjs --label=edge-check
.\scripts\render-departure-print-fixtures.ps1 -Label edge-check -Renderer 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
python -X utf8 scripts/verify-departure-print-pdfs.py --label edge-check

node scripts/departure-print-fixtures.mjs --label=before-check --source-ref=747698d --case=ja-sample-nologo-zero
.\scripts\render-departure-print-fixtures.ps1 -Label before-check
python -X utf8 scripts/verify-departure-print-pdfs.py --label before-check --observe
```

`tmp/departure-print-audit/<label>/` に条件一覧、HTML、PDF、各ページPNG、`results.json` が残る。ChromeのPDF生成・待機オプションは [公式コマンドライン資料](https://developer.chrome.com/docs/automation-and-testing/headless-cli?hl=ja) を参照。

## 監査・リリース

- 別担当の読み取り監査で、専用用紙の分離、全体の幅の連鎖、挨拶ブロックの改ページ、検査の誤判定・分離を確認。検証プロファイルの再利用と長文ページ上限の指摘は反映済み。
- 本番ビルド: 通過。新しい検証ルートは含まれない。既存のlint警告は残るがエラーはない。
- 反映前に対象ファイルの型・lint・構文・差分を再確認し、監査済み修正をGitへ保存する。
- 復旧タグを維持し、監査済み修正タグ `hamagiku-departure-print-insets-audited-20260826` を付ける。
- 既存の未追跡ファイルを避けたクリーンな作業場所の `main` で、本番ガードを実行する。監査済み変更だけをfast-forwardし、通常pushする。force pushや履歴改変はしない。
- 反映後は本番ガード、Cloudflare Pagesの対象コミットの成功、本番が配信する帳票コードを確認する。完了の証跡は本番タグ `hamagiku-production-20260826-departure-insets` とする。
- 旧asia-east2の自動ビルド失敗は修正前にも存在する。本件で設定を変更せず、稼働中のasia-northeast1とPagesを別に確認する。

## 戻す方法

即時復旧はCloudflare Pagesの履歴から修正前デプロイ `f98c0479-c04b-43c7-859a-85284624040f` に戻す。

ソースを戻す場合は最新の `main` で `git revert hamagiku-departure-print-insets-audited-20260826` を行い、差分とビルドを確認して通常pushする。後続変更がある場合は干渉を確認し、強制上書きしない。今回DB・保存データは変更しないため、データ復元操作は不要。

## 検証の限界

実PDFのページ数・文字位置・フォント・欠落を確認済みだが、ユーザー端末のネイティブ印刷ダイアログ設定や物理プリンターは操作していない。A4縦以外の用紙、任意の拡大倍率・大きなカスタム余白、異なるブラウザ版は保証対象ではない。

任意長の内容を必ず1ページにはしない。固定の挨拶文は検証済みだが、過去データ等に極端に長い独自の挨拶文がある場合は別途確認が必要。
