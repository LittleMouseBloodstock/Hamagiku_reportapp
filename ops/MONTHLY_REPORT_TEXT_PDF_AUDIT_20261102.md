# 月次レポートの文字欠け・罫線重なり修正（2026-11-02）

## 結果と対象

`625c1d6` を基点とする分離worktreeで修正・検証した。元のチェックアウト、本番、DBは変更していない。PDF生成は従来の `window.print()` とブラウザ印刷CSSを維持した。

WindowsのChrome・Edgeで、各24ケース・36ページ、合計48ケース・72ページの実PDF検査が成功した。画面/印刷 × 通常/代替フォントのDOM検査は各96条件、合計192条件が成功した。Mac実機のSafari・Quartz出力は未検証。

## 原因と画面/PDFの差異

- ロゴ付きの馬名欄46%と血統欄54%に加えて16pxのgapがあり、使用幅が親の100%を超えていた。
- 日本語馬名の `break-keep` と高さ上限、英語/副馬名の `nowrap`・`overflow-hidden` が自然な折返しを妨げていた。
- 一括印刷専用CSSは馬名・副馬名・血統を `white-space: nowrap !important` にしていた。画面で折り返せてもPDFで1行になる直接の差異だった。
- ロゴなし単票印刷の馬主欄は高さ34pxと `nowrap`・`overflow-hidden` を強制していた。
- 単票はフォント・画像・2フレームの待機後に印刷するが、一括は300msのタイマーだけで印刷していた。Mac固有の原因とは断定せず、フォント幅が変わると顕在化する共通のレイアウト不備として修正した。
- 単票印刷は画面の297mmより短い267/275mmの領域へ圧縮する。一括印刷も285mmへ別CSSで変更するため、画面だけの確認では不足する。

修正前のソースとビルドCSSを同一入力で再生成した `before/ja-batch-logo-long-text` では、英語馬名と母名のPDF欠落、DOMの欄外・切り抜きを検出した。回帰検査が旧実装を失敗させることも確認した。

## 修正内容

- gapを除いた幅を `minmax(0, 46fr) minmax(0, 54fr)` で配分する。ロゴなしは48:52。
- 馬名・血統・馬主を欄内で折り返し、空白なしの英語も `overflow-wrap:anywhere` で保持する。日本語血統はひとつの本文フローにし、flexの匿名テキスト要素によるはみ出しを避ける。
- 馬主欄は必要高へ伸ばし、写真のflex縮小を禁止する。画面プレビューは長名に応じて高さを伸ばす。印刷のA4寸法・写真寸法は維持する。
- 色、ロゴ、背景、罫線、既存の文字サイズ選択、ページ余白は維持する。新たな文字切り捨てや縮小処理は追加しない。
- 印刷前のフォント・画像・2フレーム待機を共通化し、一括へ適用する。待機中にアンマウントした場合は印刷を中止し、印刷用スタイルを復元する。

## 変更ファイル

| ファイル | 変更 |
| --- | --- |
| `frontend/components/ReportTemplate.tsx` | 欄幅、折返し、馬主欄の高さ、写真寸法保護 |
| `frontend/app/reports/[id]/page.tsx` | 単票の印刷準備を共通処理へ移す |
| `frontend/app/dashboard/clients/[id]/reports/page.tsx` | 一括のnowrap除去、印刷準備待機・キャンセル時復元 |
| `frontend/lib/print-readiness.ts`（新規） | フォント・画像・フレーム待機 |
| `scripts/print-readiness.test.mjs`（新規） | 遅延読込、画像エラー、登録中の読込競合の3テスト |
| `scripts/monthly-report-print-fixtures.mjs` | 長文16ケース追加、本番一括CSSの直接利用、旧ソース比較機能 |
| `scripts/verify-monthly-report-layout.mjs`（新規） | 画面/印刷の欄内保持、切り抜き、罫線離隔、写真寸法を検査 |
| `scripts/verify-monthly-report-print-pdfs.py` | 全文・glyph矩形・写真との重なり・緑罫線離隔を検査。正規化時の矩形対応も修正 |
| この監査記録（新規） | 原因、変更、再現手順、検証限界 |

## 検証

| 検査 | 結果 |
| --- | --- |
| `npm run build` | 成功。型検査・ビルド内lintを通過。既存のimg/Hook/未使用変数等の警告は残る |
| `node --test scripts/print-readiness.test.mjs` | 3/3成功 |
| Chromeの画面/印刷・フォント差検査 | 96/96成功 |
| Edgeの画面/印刷・フォント差検査 | 96/96成功 |
| Chromeの実PDF検査 | 24/24成功、36ページ、A4・全文・重なり・罫線離隔・既存グラフ検査 |
| Edgeの実PDF検査 | 24/24成功、36ページ、同上 |
| Popplerによる実PDFのPNG確認 | 日本語長名・ロゴあり、日本語31文字・ロゴなし、英語空白なし・一括ロゴありの3例で良好 |
| `git diff --check` | 成功 |

標準・指定馬名の長文・折返しストレスの3入力 × 日本語/英語 × 単票/一括 × ロゴ有無。指定名「ワイルドイントリーグの24」、日本語31文字、空白なし英語馬名65文字、長い日英馬主名、長い日英父母名を含む。

今回の検証記録は `tmp/monthly-report-print-audit/verified/` と `verified-edge/` の `results.json`、`layout-chrome.json` / `layout-msedge.json` に保存した。生成物には検証用の架空データだけを使用し、本番の認証・通信は行っていない。

### 再実行

既存のesbuild・PyMuPDF監査依存とfrontendビルドが必要。DOM検査にはPlaywrightとChrome/Edgeを使用する。今回はCodex同梱Playwrightを `NODE_PATH` へ指定した。ネットワークフォントを除いたローカルfixtureで、外部HTTP通信を拒否し、代替フォントでも検査する。

```powershell
node --test scripts/print-readiness.test.mjs
node scripts/monthly-report-print-fixtures.mjs --label=current
node scripts/verify-monthly-report-layout.mjs --label=current --browser=chrome --write-pdfs
python -X utf8 scripts/verify-monthly-report-print-pdfs.py --label=current
```

従来のCLIレンダラーも引き続き利用できる。

```powershell
./scripts/render-monthly-report-print-fixtures.ps1 -Label current
python -X utf8 scripts/verify-monthly-report-print-pdfs.py --label=current
```

Edge比較時は別ラベルでfixtureを生成し、`--browser=msedge --write-pdfs` を指定する。修正前比較には `--source-ref=625c1d6 --build-root=<修正前frontend/.next>` を使用する。

## 残存リスク

- Mac実機、Safari、Quartz PDFの最終表示は確認できていない。WindowsのWebKitやユーザーエージェント変更をMac実機検証の代用とはしていない。
- 既存の外部Webフォント方式を維持しており、Macの実フォントでの字形・改行位置は追加確認が必要。今回の通常/代替フォント検査は字幅の違いに対する欄内保持を確認するもの。
- A4の固定印刷領域と既存のコメント枠仕様は維持した。今回より大幅に長い入力や大量の付録を含む帳票のページ分割は、この修正の検証範囲外。
- 本番反映は行っていない。Mac確認では日本語の指定馬名と英語長名を、単票/一括・ロゴ有無で確認する。
