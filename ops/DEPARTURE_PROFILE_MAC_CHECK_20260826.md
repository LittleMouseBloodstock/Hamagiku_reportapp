# 退厩レポート：Macでの最終確認

この確認はまだ実施していません。Windowsの検証結果だけでMac対応確認済みとは扱いません。本番反映は保留しています。

## 確認するもの

検証用ZIPをMacで展開し、フォルダ内の `index.html` をChromeとSafariでそれぞれ開いてください。`assets` フォルダは移動・削除しないでください。すべて架空の検証データで、ログインや本番データの変更はありません。

1. 一覧から確認対象のレポートを開く。
2. ページのタイトルが `departure-audit:NotoSansJP-ready` になるまで待つ。`fonts-pending` / `fonts-failed` のままなら印刷せず記録する。
3. 入力欄と帳票の順序が「馬名 → 性齢 → 父母 → 馬主・調教師」であることを確認する。
4. 帳票を下端までスクロールし、挨拶・署名・フッター、紙の白い余白、その外の濃いグレーが切れていないことを確認する。
5. 印刷でA4・縦・倍率100%を選び、ブラウザ自身のヘッダー／フッターは無効にしてPDF保存する。背景グラフィックも有効にする。設定できない項目は変更せず、その状態を記録する。
6. 一覧の想定ページ数と比較する。`long` は24段落の長文なので複数ページが正常。`long-names` は馬名・父母名が長い条件で、標準量と同様に1ページを想定する。
7. 文字の欠落・重なり・文字化け、余白の消失がないことを確認する。標準量・long-namesでは挨拶だけの次ページがないことも確認する。父母のラベルと日本語の「様」も確認する。

## 確認範囲と返していただくもの

Chrome・Safariそれぞれで一覧の全30条件を確認する。まずは日英の `standard` / `long-names` / `missing` / `dam-only` / `long` を優先し、残りのロゴ有無・余白ゼロ上書き条件も確認する。HTMLの `zero` はCSSで余白ゼロを上書きする検証であり、印刷ダイアログの全設定を自動操作するものではない。

24段落の長文は、日本語2ページ・英語3ページがWindowsでの結果。英語では挨拶とフッターを一体のまま3ページ目に送る。任意の長文の1ページ化や、すべての文章量で結びの独立ページをなくすことまでは、今回の合格条件に含めていない。

- macOSのバージョン、Chrome／Safariのバージョン
- 保存したPDF（条件名とブラウザ名が分かる名前）
- 画面の馬名周辺と紙の下端のスクリーンショット
- 印刷設定、問題があった条件と見え方

返されたPDFをWindows側と同じ文字・余白・改ページ・位置の検査にかける。実機の確認記録が揃った後に、本番反映の可否を判断する。

## 検証一式の作成方法（作業担当者向け）

本番用ビルド → `scripts/departure-print-fixtures.mjs` → `scripts/render-departure-print-fixtures.ps1` → `scripts/verify-departure-print-pdfs.py` の順で、最終版のWindows検証を完了する。

`node scripts/export-departure-cross-platform-fixtures.mjs --label=profile-final-chrome --package=mac-departure-profile-20260826` で、合格した検証データだけを `output/pdf/departure-print-audit/mac-departure-profile-20260826` へ出力する。既存の出力フォルダは上書きしない。HTML・配信フォント・ロゴ・期待値・ファイルのSHA-256だけを含め、認証情報・ブラウザプロファイル・実データを含めない。

本番版の復旧点と作業進捗は `ops/DEPARTURE_PROFILE_CROSS_PLATFORM_AUDIT_20260826.md` を参照。
