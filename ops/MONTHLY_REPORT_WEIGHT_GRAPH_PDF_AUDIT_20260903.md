# 月次レポート体重グラフ PDF 監査（2026-09-03）

## 対象症状

Mac環境で月次レポートをロゴ付きPDFとして出力すると、体重推移グラフのx軸日付がコメント枠上辺に重なる。ロゴなし印刷は既存表示を維持する。

## 根本原因

体重グラフは見出しの下に高さ90pxのSVGを置き、SVG内の日付ラベルを `y=125`（viewBox高さ132）へ描画する。一方、ロゴ付き印刷の `.data-section` は高さ100px、コメント枠の上余白は1pxだった。見出しとSVGの必要高が親要素を超え、`overflow: visible` の日付だけが次のコメント枠へはみ出していた。親がflex itemのため、固定高も縮小対象だった。

同じ100px指定が次の2経路に重複していた。

- 単票: `frontend/components/ReportTemplate.tsx` 内の印刷CSS
- 一括: `frontend/app/dashboard/clients/[id]/reports/page.tsx` 内の一括印刷CSS

履歴監査では、`3800e3e` がロゴ付き印刷領域を105pxから100pxへ縮小し、`bc125eb` がグラフのviewBox・文字を拡大した際にロゴなしだけを115pxへ広げていた。ロゴ付き100pxが残ったことが再発原因である。

## 修正契約

- ロゴ付きの `.data-section` を `height: 120px; min-height: 120px; flex-shrink: 0` に統一する。
- ロゴなしは既存の115pxを維持し、`min-height: 115px; flex-shrink: 0` だけを明示する。
- 単票・一括の両経路へ同じ契約を適用する。
- SVGの重量値・日付・座標は変更しない。

## 実測

添付症状と同じ重量履歴（445, 445, 455, 464, 473）で、印刷メディア・A4 PDFを検査した。

| 条件 | x軸日付下端からコメント領域まで | 判定 |
| --- | ---: | --- |
| 修正前・ロゴ付きDOM | -12.23px | 重なりを再現 |
| 修正後・ロゴ付きDOM | +7.77px | 解消 |
| 修正後・単票PDF | +10.84pt（枠上端） | 合格 |
| 修正後・一括PDF | +12.05pt（枠上端） | 合格 |

本番ビルド後に、日本語/英語 × 単票/一括 × ロゴあり/なしの8条件、合計12ページをChromeとEdgeでそれぞれ検査した（合計16条件、24ページ）。すべてA4で、ページ数、ロゴ有無、5つの重量値、5つの日付、コメント本文、ロゴ付きの正の安全離隔を確認した。

## 永続回帰テスト

初回だけPyMuPDFを既存のPDF監査用領域へ導入する。

```powershell
python -m pip install --target tmp/departure-print-audit/python -r scripts/requirements-departure-print-audit.txt
```

本番CSSを生成してから月次PDFを検査する。

```powershell
Push-Location frontend
npm run build
Pop-Location
node scripts/monthly-report-print-fixtures.mjs --label=current
.\scripts\render-monthly-report-print-fixtures.ps1 -Label current
python -X utf8 scripts/verify-monthly-report-print-pdfs.py --label=current
```

Edgeでも同じfixtureを使える。

```powershell
.\scripts\render-monthly-report-print-fixtures.ps1 -Label current -Renderer 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
python -X utf8 scripts/verify-monthly-report-print-pdfs.py --label=current
```

fixture生成時に単票・一括それぞれの120px/115px、`min-height`、`flex-shrink: 0` をソース契約として検査する。PDF検査では、ロゴ付きだけx軸日付下端とコメントlegend/枠上端の両方に正の離隔を必須とする。ロゴなしは既存仕様を変えず、文字・画像・A4・ページ数の回帰だけを検査する。

## 環境上の限界

今回の自動実PDF検査はWindows上のChromeとEdgeで実施した。Mac実機のSafari/Quartzによる最終確認はこのワークスペースからは実行できない。ただし、修正対象はOS依存のフォント補正ではなく、実測で再現した親要素の高さ不足とflex縮小である。Mac確認時も上記8条件のうち最低限、日本語・ロゴ付きの単票/一括を確認する。

## 本番反映承認・復旧計画

- 2026-09-03、ユーザーから「戻れるように管理して本番まで進めてください」と明示的な指示を受けた。Mac実機未確認の制約を残したまま、Windowsで検証済みのフロントエンドだけを反映する。
- 反映先は `main` → Cloudflare Pages `hamagiku-reportapp`。Shinba Report、Cloud Run API、DB、認証設定には反映しない。
- 反映前の本番は `671ab833224d62306c7d113b83ba2369229a9ad6`、Pages `1276f197-d6d2-4e22-9339-c611245f4752`。専用タグ `hamagiku-before-20260903-monthly-weight-graph` とPagesのデプロイ履歴を復旧点として残す。
- 反映成功後は新しいmainへ `hamagiku-production-20260903-monthly-weight-graph` を付け、通常pushでリモートへ保存する。force push、rebase、既存タグの付け替えは行わない。
- 問題時はPagesを上記デプロイへロールバックし、Gitはreset/force pushではなく通常のrevertコミットで本番ソースと同期する。
- 既存の未追跡 `frontend/Dockerfile` と `frontend/cloudbuild.yaml` は今回のコミット・本番ソースへ含めない。
