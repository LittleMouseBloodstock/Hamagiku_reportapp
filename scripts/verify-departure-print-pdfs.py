"""本物のPDFからページ数・用紙サイズ・印字位置・本文欠落を検査する。"""
import argparse
import json
from pathlib import Path
import re
import sys
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/departure-print-audit/python'))
import pymupdf  # noqa: E402

IDENTITY_FIELDS = ('horseName', 'sexAge', 'sire', 'dam', 'owner', 'trainer')
IDENTITY_Y_TOLERANCE = 1.5
RECT_OVERLAP_TOLERANCE = 0.05


def normalize_text(value):
    """PDFの行折返し・空白を無視してfixture文字列を照合する。"""
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value))


def visible_fonts(page):
    """画像や空spanを除き、PDFに実際に描画された文字のフォント名を返す。"""
    fonts = []
    for block in page.get_text('dict').get('blocks', []):
        if block.get('type') != 0:
            continue
        for line in block.get('lines', []):
            for span in line.get('spans', []):
                if span.get('text', '').strip():
                    fonts.append(span.get('font', ''))
    return fonts


def allowed_report_font(font, fonts_ready):
    """実フォント名の表記揺れを許容し、Type3は実フォント確認時だけ許可する。"""
    compact = re.sub(r'[\s_-]+', '', font).lower()
    return ('noto' in compact and 'sans' in compact) or (fonts_ready and compact.startswith('type3'))


def text_occurrences(page, value):
    """描画順の文字列から、別blockへ折り返した父母名も実矩形付きで探す。"""
    needle = normalize_text(value)
    if not needle:
        return []

    drawn_characters = []
    # 日本語は「父＋馬名」が1単語に結合されるため、単語でなく文字単位の矩形を使う。
    for block in page.get_text('rawdict', sort=False)['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                for character in span['chars']:
                    text = normalize_text(character['c'])
                    if text:
                        drawn_characters.append((text, pymupdf.Rect(character['bbox'])))

    occurrences = []
    for block_words in [drawn_characters]:
        stream = ''
        indexed_words = []
        for text, rect in block_words:
            start = len(stream)
            stream += text
            indexed_words.append((start, len(stream), rect))
        for match in re.finditer(re.escape(needle), stream):
            rects = [
                rect for start, end, rect in indexed_words
                if start < match.end() and end > match.start()
            ]
            if not rects:
                continue
            # 無関係の列・項目を連結した見かけの一致を除き、自然な同一行・折返しだけを認める。
            continuous = True
            for previous, current in zip(rects, rects[1:]):
                height = max(previous.height, current.height)
                delta_y = current.y0 - previous.y0
                if abs(delta_y) <= 2:
                    continuous &= -1 <= current.x0 - previous.x1 <= height * 1.5
                else:
                    continuous &= 0 < delta_y <= height * 1.75
            if not continuous:
                continue
            occurrences.append({
                'rects': rects,
                'top': min(rect.y0 for rect in rects),
                'bottom': max(rect.y1 for rect in rects),
                'bbox': [
                    min(rect.x0 for rect in rects), min(rect.y0 for rect in rects),
                    max(rect.x1 for rect in rects), max(rect.y1 for rect in rects),
                ],
            })
    return sorted(occurrences, key=lambda item: (item['top'], item['bbox'][0]))


def rects_overlap(left, right):
    """文字矩形の正の面積の重なりだけを検出する。"""
    return (
        min(left.x1, right.x1) - max(left.x0, right.x0) > RECT_OVERLAP_TOLERANCE
        and min(left.y1, right.y1) - max(left.y0, right.y0) > RECT_OVERLAP_TOLERANCE
    )


def occurrences_overlap(left, right):
    return any(rects_overlap(left_rect, right_rect) for left_rect in left['rects'] for right_rect in right['rects'])


def non_overlapping_parent_pair(sire_occurrences, dam_occurrences):
    """同名候補が複数ある場合も、横並びの父母候補を選択する。"""
    pairs = [
        (max(sire['top'], dam['top']), sire['bbox'][0], sire, dam)
        for sire in sire_occurrences
        for dam in dam_occurrences
        if not occurrences_overlap(sire, dam)
    ]
    return min(pairs, key=lambda item: (item[0], item[1]))[2:] if pairs else None


def serializable_occurrence(occurrence):
    return {
        'bbox': [round(value, 2) for value in occurrence['bbox']],
        'rects': [[round(value, 2) for value in rect] for rect in occurrence['rects']],
    }


def labeled_candidates(page, candidates, field, language):
    """同名の別項目を選ばないよう、対応ラベルの隣／直下と段組位置で限定する。"""
    labels = {
        'ja': {'sexAge': '性齢', 'sire': '父', 'dam': '母', 'owner': '馬主', 'trainer': '調教師'},
        'en': {'sexAge': 'Sex / age', 'sire': 'Sire', 'dam': 'Dam', 'owner': 'OWNER', 'trainer': 'TRAINER'},
    }
    label = labels[language][field]
    label_rects = page.search_for(label)
    filtered = []
    for candidate in candidates:
        for rect in label_rects:
            if field in ('owner', 'trainer'):
                matches = abs(candidate['bbox'][0] - rect.x0) < 4 and -IDENTITY_Y_TOLERANCE <= candidate['top'] - rect.y1 < 24
            else:
                matches = 0 <= candidate['bbox'][0] - rect.x1 < 12 and abs(candidate['top'] - rect.y0) < 4
            if field == 'sire':
                matches &= candidate['bbox'][2] < page.rect.width / 2
            if field == 'dam' and len(page.search_for(labels[language]['sire'])):
                matches &= candidate['bbox'][0] > page.rect.width / 2
            if matches:
                filtered.append(candidate)
                break
    return filtered


def horse_heading_candidate(page, candidate):
    """馬名は本文や宛名中の同じ文字列でなく、24pxの見出しで照合する。"""
    first_word = candidate['rects'][0]
    point = pymupdf.Point((first_word.x0 + first_word.x1) / 2, (first_word.y0 + first_word.y1) / 2)
    return any(
        point in pymupdf.Rect(span['bbox']) and abs(span['size'] - 18) < 0.15
        for block in page.get_text('dict')['blocks'] for line in block.get('lines', []) for span in line['spans']
    )


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
    has_identity_text = 'identityText' in fixture
    identity_values = None
    if has_identity_text:
        identity_text = fixture['identityText']
        if not isinstance(identity_text, dict):
            failures.append('identityTextがオブジェクトではない')
        elif any(field not in identity_text for field in IDENTITY_FIELDS):
            failures.append('identityTextの項目が不足している')
        elif any(not isinstance(identity_text[field], str) for field in IDENTITY_FIELDS):
            failures.append('identityTextの値が文字列ではない')
        else:
            identity_values = {field: identity_text[field] for field in IDENTITY_FIELDS}
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
    drawn_text = ''
    closing_pages = []
    footer_pages = []
    body_sizes = []
    body_fonts = []
    all_visible_fonts = []
    image_count = 0
    for index, page in enumerate(document):
        if abs(page.rect.width / mm - 210) > 0.6 or abs(page.rect.height / mm - 297) > 0.6:
            failures.append(f'{index + 1}ページ目がA4ではない')
        words = page.get_text('words')
        all_visible_fonts += visible_fonts(page)
        # 描画順ではヘッダーが末尾になる。段組内の改行を保ったブロック順で検査する。
        text = ''.join(block[4] for block in page.get_text('blocks', sort=True) if block[6] == 0)
        image_count += len(page.get_image_info())
        full_text += text
        drawn_text += page.get_text(sort=False)
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
    if not has_identity_text:
        # identityText導入前のmanifestだけは、従来の固定必須文字を維持する。
        horse_required = 'レイアウト検証馬' if fixture['language'] == 'ja' else 'SampleHorse'
    elif identity_values is not None:
        horse_required = identity_values['horseName']
    else:
        horse_required = ''
    required = [horse_required, '497kg', '2.5kg']
    required += ['本馬の安全と今後の活躍を心よりお祈り申し上げます。', '浜菊ファーム一同'] if fixture['language'] == 'ja' else ['Wesincerelywishthishorse', 'EveryoneatHamagikuFarm']
    for value in required:
        if normalize_text(value) not in normalize_text(full_text):
            failures.append(f'必須文字が欠落: {value}')
    for value in fixture.get('expectedText', []):
        # 段組の折返しはブロック整列順で交互になるため、描画順でも全文を照合する。
        if normalize_text(value) not in normalize_text(full_text) and normalize_text(value) not in normalize_text(drawn_text):
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
    if any(not allowed_report_font(font, fonts_ready) for font in body_fonts):
        failures.append('本文が想定のNoto Sans系フォントではない')
    unexpected_fonts = sorted({font for font in all_visible_fonts if not allowed_report_font(font, fonts_ready)})
    if unexpected_fonts:
        failures.append(f'可視文字がNoto Sans/Type3以外のフォントを使用: {", ".join(unexpected_fonts)}')

    identity_matches = {}
    if identity_values is not None:
        if not document:
            failures.append('identityTextを検査する1ページ目がない')
        else:
            first_page = document[0]
            identity_candidates = {}
            for field in IDENTITY_FIELDS:
                value = identity_values[field]
                if not normalize_text(value):
                    continue
                candidates = text_occurrences(first_page, value)
                if field == 'horseName':
                    candidates = [candidate for candidate in candidates if horse_heading_candidate(first_page, candidate)]
                else:
                    candidates = labeled_candidates(first_page, candidates, field, fixture['language'])
                if not candidates:
                    failures.append(f'1ページ目のidentity文字が欠落: {field}')
                else:
                    identity_candidates[field] = candidates

            # 同じ名前の候補があっても、父母それぞれの実矩形が重ならない組を選ぶ。
            if 'sire' in identity_candidates and 'dam' in identity_candidates:
                parent_pair = non_overlapping_parent_pair(identity_candidates['sire'], identity_candidates['dam'])
                if not parent_pair:
                    failures.append('父と母の文字矩形が重なっている')
                else:
                    identity_matches['sire'], identity_matches['dam'] = parent_pair
            for field, candidates in identity_candidates.items():
                identity_matches.setdefault(field, candidates[0])
            for left, right in [('sire', 'dam'), ('owner', 'trainer')]:
                if left in identity_matches and right in identity_matches:
                    if identity_matches[left]['bbox'][0] >= identity_matches[right]['bbox'][0]:
                        failures.append(f'identity文字の左右順序が不正: {left} -> {right}')

            ordered_fields = ['horseName']
            if normalize_text(identity_values['sexAge']):
                ordered_fields.append('sexAge')
            if normalize_text(identity_values['sire']) or normalize_text(identity_values['dam']):
                ordered_fields.append('parents')
            ordered_fields.append('recipients')
            ordered_positions = []
            for field in ordered_fields:
                fields = ('sire', 'dam') if field == 'parents' else ('owner', 'trainer') if field == 'recipients' else (field,)
                positions = [identity_matches[item] for item in fields if item in identity_matches]
                if positions:
                    ordered_positions.append((field, min(item['top'] for item in positions), max(item['bottom'] for item in positions)))
            for previous, current in zip(ordered_positions, ordered_positions[1:]):
                if current[1] + IDENTITY_Y_TOLERANCE < previous[2]:
                    failures.append(f'identity文字のY順序が不正または重なり: {previous[0]} -> {current[0]}')

    if bool(image_count) != fixture['logo']:
        failures.append('ロゴの表示設定とPDF内の画像が一致しない')
    results.append({
        'case': fixture['id'], 'pages': len(document), 'pass': not failures, 'failures': failures,
        'fontsReady': fonts_ready, 'bodyFontPt': body_sizes, 'bodyFonts': body_fonts,
        'visibleFonts': sorted(set(all_visible_fonts)), 'images': image_count, 'layout': page_results,
        'identityTextRects': {field: serializable_occurrence(occurrence) for field, occurrence in identity_matches.items()},
    })
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
