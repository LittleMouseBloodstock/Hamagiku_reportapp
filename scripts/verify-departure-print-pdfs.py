"""本物のPDFからページ数・用紙サイズ・印字位置・本文欠落を検査する。"""
import argparse
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/departure-print-audit/python'))
import pymupdf  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument('--label', default='current')
parser.add_argument('--observe', action='store_true', help='修正前の観測用。失敗を記録するが終了値にしない。')
args = parser.parse_args()
if not re.fullmatch(r'[a-z0-9-]+', args.label):
    raise SystemExit('不正な検証名です')

directory = ROOT / 'tmp/departure-print-audit' / args.label
fixtures = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
results = []
mm = 72 / 25.4

for fixture in fixtures:
    pdf_path = Path(fixture['pdf']).resolve()
    if not pdf_path.is_relative_to(directory.resolve()):
        raise SystemExit('検証用領域外のPDFは読みません')
    document = pymupdf.open(pdf_path)
    failures = []
    fonts_ready = document.metadata.get('title') == 'departure-audit:NotoSansJP-ready'
    if not fonts_ready:
        failures.append('実フォントの読み込み完了をPDFメタデータで確認できない')
    if fixture['content'] != 'long' and len(document) != 1:
        failures.append(f'標準量が{len(document)}ページ')
    if fixture['content'] == 'long' and len(document) < 2:
        failures.append('長文の出力が不足している可能性')
    if fixture['content'] == 'long' and len(document) > 3:
        failures.append('24段落の長文が想定上限の3ページを超えている')

    page_results = []
    full_text = ''
    closing_pages = []
    footer_pages = []
    body_sizes = []
    body_fonts = []
    image_count = 0
    for index, page in enumerate(document):
        if abs(page.rect.width / mm - 210) > 0.6 or abs(page.rect.height / mm - 297) > 0.6:
            failures.append(f'{index + 1}ページ目がA4ではない')
        words = page.get_text('words')
        # 描画順ではヘッダーが末尾になる。段組内の改行を保ったブロック順で検査する。
        text = ''.join(block[4] for block in page.get_text('blocks', sort=True) if block[6] == 0)
        image_count += len(page.get_image_info())
        full_text += text
        normalized_page = re.sub(r'\s+', '', text)
        if ('本馬の安全' if fixture['language'] == 'ja' else 'Wesincerelywishthishorse') in normalized_page:
            closing_pages.append(index)
        if 'HAMAGIKUFARM·HOKKAIDO,JAPAN' in normalized_page:
            footer_pages.append(index)
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    if '2.5kg' in span['text']:
                        body_sizes.append(span['size'])
                        body_fonts.append(span['font'])
        if not words:
            failures.append(f'{index + 1}ページ目が空白')
            continue
        bounds = pymupdf.Rect(
            min(word[0] for word in words), min(word[1] for word in words),
            max(word[2] for word in words), max(word[3] for word in words),
        )
        insets = {
            'left': bounds.x0 / mm, 'top': bounds.y0 / mm,
            'right': (page.rect.width - bounds.x1) / mm,
            'bottom': (page.rect.height - bounds.y1) / mm,
        }
        if insets['left'] < 14 or insets['right'] < 14 or insets['top'] < 11 or insets['bottom'] < 11:
            failures.append(f'{index + 1}ページ目の印字が安全余白の外')
        image_path = directory / f"{fixture['id']}-page-{index + 1}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(1.3, 1.3), alpha=False).save(image_path)
        page_results.append({'page': index + 1, 'textInsetsMm': {key: round(value, 2) for key, value in insets.items()}, 'image': str(image_path)})

    normalized = re.sub(r'\s+', '', full_text)
    required = ['レイアウト検証馬' if fixture['language'] == 'ja' else 'SampleHorse', '497kg', '2.5kg']
    required += ['本馬の安全と今後の活躍を心よりお祈り申し上げます。', '浜菊ファーム一同'] if fixture['language'] == 'ja' else ['Wesincerelywishthishorse', 'EveryoneatHamagikuFarm']
    for value in required:
        if value not in normalized:
            failures.append(f'必須文字が欠落: {value}')
    for value in fixture.get('expectedText', []):
        if re.sub(r'\s+', '', value) not in normalized:
            failures.append(f'本文が欠落: {value}')
    for number in range(1, fixture['commentCount'] + 1):
        marker = f"確認{number:02d}：" if fixture['language'] == 'ja' else f"Check{number:02d}:"
        if normalized.count(marker) != 1:
            failures.append(f'段落が欠落または重複: {marker}')
    if 'HAMAGIKUFARM·HOKKAIDO,JAPAN' not in normalized:
        failures.append('フッターが欠落')
    if closing_pages != footer_pages or len(closing_pages) != 1:
        failures.append('挨拶文とフッターが分断または重複')
    if not body_sizes or any(abs(size - 11.25) > 0.15 for size in body_sizes):
        failures.append('本文の15px相当サイズが維持されていない')
    # この検証環境の可変フォントはType3名になるため、上の読み込み検査と併せて確認する。
    if any('NotoSans' not in font and not (fonts_ready and font.startswith('Type3')) for font in body_fonts):
        failures.append('本文が想定のNoto Sans系フォントではない')
    if bool(image_count) != fixture['logo']:
        failures.append('ロゴの表示設定とPDF内の画像が一致しない')
    results.append({'case': fixture['id'], 'pages': len(document), 'pass': not failures, 'failures': failures, 'fontsReady': fonts_ready, 'bodyFontPt': body_sizes, 'bodyFonts': body_fonts, 'images': image_count, 'layout': page_results})
    document.close()

# CSSの用紙余白設定と余白ゼロ設定で、位置とページ数が変わらないことを検査する。
by_case = {result['case']: result for result in results}
for result in results:
    if not result['case'].endswith('-css'):
        continue
    other = by_case.get(result['case'][:-4] + '-zero')
    if not other:
        continue
    equal = result['pages'] == other['pages'] and len(result['layout']) == len(other['layout'])
    if equal:
        equal = all(
            abs(page['textInsetsMm'][side] - other_page['textInsetsMm'][side]) < 0.25
            for page, other_page in zip(result['layout'], other['layout'])
            for side in ['left', 'top', 'right', 'bottom']
        )
    if not equal:
        for item in [result, other]:
            item['pass'] = False
            item['failures'].append('用紙余白の設定で出力位置・改ページが変わる')

(directory / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({
    'cases': len(results), 'passed': sum(result['pass'] for result in results),
    'pageCounts': {result['case']: result['pages'] for result in results},
    'failures': [{'case': result['case'], 'failures': result['failures']} for result in results if not result['pass']],
}, ensure_ascii=False, indent=2))
if not args.observe and any(not result['pass'] for result in results):
    raise SystemExit(1)
