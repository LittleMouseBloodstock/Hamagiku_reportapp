"""月次レポートPDFの永続回帰ゲート（実PDFの文字・画像・矩形を検査）。"""
import argparse
import json
from pathlib import Path
import re
import sys
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/departure-print-audit/python'))
try:
    import pymupdf  # noqa: E402
except ModuleNotFoundError as error:
    raise SystemExit(
        'PyMuPDFがありません。scripts/requirements-departure-print-audit.txtを'
        'tmp/departure-print-audit/pythonへインストールしてください。'
    ) from error

MM = 72 / 25.4
SAFE_GAP_PT = 0.5


def norm(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', str(value)))


def text_rects(page, value):
    """search_forを主に使い、PDFフォントの分割時は文字矩形から復元する。"""
    found = list(page.search_for(value))
    if found:
        return found
    needle = norm(value)
    chars = []
    for block in page.get_text('rawdict', sort=False).get('blocks', []):
        for line in block.get('lines', []):
            for span in line.get('spans', []):
                for char in span.get('chars', []):
                    # streamから除外する空白はbbox配列にも追加しない。NFKCで複数
                    # codepointへ展開される文字は、各codepointへ同じglyph矩形を割り当てる。
                    normalized = norm(char.get('c', ''))
                    if normalized:
                        rect = pymupdf.Rect(char['bbox'])
                        chars.extend((codepoint, rect) for codepoint in normalized)
    stream = ''.join(char for char, _ in chars)
    rects = []
    for match in re.finditer(re.escape(needle), stream):
        selected = [rect for index, (_, rect) in enumerate(chars) if match.start() <= index < match.end()]
        if selected:
            rects.append(pymupdf.Rect(min(r.x0 for r in selected), min(r.y0 for r in selected), max(r.x1 for r in selected), max(r.y1 for r in selected)))
    return rects


def frame_top(page, legend):
    """fieldsetの外枠上端を、legend近傍のrect/line描画から取得する。"""
    candidates = []
    for drawing in page.get_drawings():
        for item in drawing.get('items', []):
            if item[0] == 're':
                rect = pymupdf.Rect(item[1])
                if rect.width > 250 and abs(rect.y0 - legend.y0) < 15:
                    candidates.append(rect.y0)
            elif item[0] == 'l':
                left, right = item[1], item[2]
                if abs(left.y - right.y) < 0.5 and abs(left.y - legend.y0) < 15 and abs(right.x - left.x) > 250:
                    candidates.append(left.y)
    return min(candidates) if candidates else None


def overlap_area(left, right):
    width = max(0.0, min(left.x1, right.x1) - max(left.x0, right.x0))
    height = max(0.0, min(left.y1, right.y1) - max(left.y0, right.y0))
    return width * height


def find_pedigree_border(page):
    """血統欄の左罫線（浜菊グリーンの細い縦矩形）を取得する。"""
    candidates = []
    for drawing in page.get_drawings():
        rect = drawing.get('rect')
        fill = drawing.get('fill')
        if not rect or not fill or len(fill) < 3:
            continue
        if (
            rect.x0 > 200
            and 1.5 <= rect.width <= 3.5
            and rect.height > 30
            and all(abs(fill[index] - expected) <= 0.01 for index, expected in enumerate((0.102, 0.2353, 0.2039)))
        ):
            candidates.append(rect)
    return min(candidates, key=lambda rect: (rect.y0, rect.x0)) if candidates else None


def validate_layout_groups(page, groups, image_info):
    """長文fixtureの馬名・血統・馬主が同じ矩形へ侵入しないことを確認する。"""
    failures = []
    group_rects = {}
    for group, values in groups.items():
        rects = []
        for value in values:
            value_rects = text_rects(page, value)
            if not value_rects:
                failures.append(f'{group}の値の文字矩形が取得できない: {value}')
            rects.extend(value_rects)
        if not rects:
            failures.append(f'{group}の文字矩形が取得できない')
            continue
        # 複数行の外接矩形では、離れた行の空間まで重なったと誤判定する。
        # 実際のglyph矩形同士を比較して、文字の侵入だけを検知する。
        group_rects[group] = rects

    group_names = list(group_rects)
    for index, left_name in enumerate(group_names):
        for right_name in group_names[index + 1:]:
            for left_rect in group_rects[left_name]:
                for right_rect in group_rects[right_name]:
                    area = overlap_area(left_rect, right_rect)
                    if area > 0:
                        failures.append(f'{left_name}と{right_name}の矩形が重なる: {area:.2f}pt^2')

    # 正方形のロゴは馬名見出しに意図的に近接するため、写真（fixtureの非正方形画像）だけを対象にする。
    image_rects = [
        pymupdf.Rect(item['bbox'])
        for item in image_info
        if item.get('bbox') and item.get('width') != item.get('height')
    ]
    for group, group_text_rects in group_rects.items():
        for group_rect in group_text_rects:
            for image_rect in image_rects:
                area = overlap_area(group_rect, image_rect)
                if area > 0:
                    failures.append(f'{group}と写真の矩形が重なる: {area:.2f}pt^2')
    return failures


def validate_horse_border_gap(page, groups):
    """馬名glyphの右端と血統欄左罫線の間に安全離隔を要求する。"""
    border = find_pedigree_border(page)
    if not border:
        return ['血統欄の左罫線を取得できない'], None
    horse_rects = [rect for value in groups.get('horseName', []) for rect in text_rects(page, value)]
    overlapping_rects = [rect for rect in horse_rects if rect.y1 > border.y0 and rect.y0 < border.y1]
    if not overlapping_rects:
        return ['罫線の高さ範囲に馬名glyphがない'], None
    horse_right = max(rect.x1 for rect in overlapping_rects)
    gap = border.x0 - horse_right
    if gap <= SAFE_GAP_PT:
        return [f'馬名右端→血統欄左罫線の安全離隔不足: {gap:.2f}pt'], gap
    return [], gap


parser = argparse.ArgumentParser()
parser.add_argument('--label', default='current')
parser.add_argument('--observe', action='store_true', help='失敗を記録するが終了値を0にする')
args = parser.parse_args()
if not re.fullmatch(r'[a-z0-9-]+', args.label):
    raise SystemExit('不正な検証名です')
directory = (ROOT / 'tmp/monthly-report-print-audit' / args.label).resolve()
manifest_path = directory / 'manifest.json'
if not manifest_path.is_file():
    raise SystemExit(f'fixture manifestがありません: {manifest_path}')
fixtures = json.loads(manifest_path.read_text(encoding='utf-8'))
results = []

for fixture in fixtures:
    failures = []
    pdf_path = Path(fixture['pdf']).resolve()
    if not pdf_path.is_relative_to(directory):
        raise SystemExit('検証用領域外のPDFは読みません')
    if not pdf_path.is_file():
        results.append({'case': fixture['id'], 'pages': 0, 'pass': False, 'failures': ['PDFがありません']})
        continue
    document = pymupdf.open(pdf_path)
    expected_pages = int(fixture['expectedPages'])
    if len(document) != expected_pages:
        failures.append(f'ページ数が不正: {len(document)}（期待値 {expected_pages}）')
    if document.metadata.get('title') != 'monthly-audit:fonts-ready':
        failures.append('ローカルフォントの読み込み完了をPDFメタデータで確認できない')
    page_results = []
    for page_index, page in enumerate(document):
        axis_bottom = None
        legend = None
        frame = None
        horse_border_gap = None
        if abs(page.rect.width / MM - 210) > 0.6 or abs(page.rect.height / MM - 297) > 0.6:
            failures.append(f'{page_index + 1}ページ目がA4ではない')
        visible = norm(page.get_text('text'))
        for value in fixture['weights']:
            if norm(value) not in visible:
                failures.append(f'{page_index + 1}ページ目の体重値が欠落: {value}')
        for value in fixture['xAxisLabels']:
            rects = text_rects(page, value)
            if not rects:
                failures.append(f'{page_index + 1}ページ目のx軸ラベルが欠落: {value}')
        for value in fixture.get('expectedText', []):
            if norm(value) not in visible:
                failures.append(f'{page_index + 1}ページ目の本文が欠落: {value}')

        label_rects = text_rects(page, fixture['commentLegend'])
        if not label_rects:
            failures.append(f'{page_index + 1}ページ目のコメントlegendが欠落')
            gap_label = None
            gap_frame = None
        else:
            legend = min(label_rects, key=lambda rect: rect.y0)
            axis_rects = [rect for value in fixture['xAxisLabels'] for rect in text_rects(page, value)]
            axis_bottom = max((rect.y1 for rect in axis_rects), default=None)
            frame = frame_top(page, legend)
            gap_label = legend.y0 - axis_bottom if axis_bottom is not None else None
            gap_frame = frame - axis_bottom if frame is not None and axis_bottom is not None else None
            # ロゴ有りは今回の再発条件であり、x軸下端からlegend/枠上端までを厳格にゲートする。
            # ロゴ無しは既存の正常出力を尊重し、同じ幾何値を記録しつつ非欠落だけを確認する。
            if fixture['logo'] and (gap_label is None or gap_label <= SAFE_GAP_PT):
                failures.append(f'x軸下端→コメントlegend上端の安全離隔不足: {gap_label}')
            if fixture['logo'] and (gap_frame is None or gap_frame <= SAFE_GAP_PT):
                failures.append(f'x軸下端→コメント枠上端の安全離隔不足: {gap_frame}')
        images = page.get_image_info()
        if fixture.get('layoutGroups'):
            failures.extend(validate_layout_groups(page, fixture['layoutGroups'], images))
            border_failures, horse_border_gap = validate_horse_border_gap(page, fixture['layoutGroups'])
            failures.extend(border_failures)
        logo_images = [image for image in images if image['width'] == image['height']]
        if len(images) < int(fixture['expectedImageCountMin']):
            failures.append(f'画像数が不足: {len(images)}')
        expected_logo_images = int(fixture['expectedLogoImageCount'])
        if len(logo_images) != expected_logo_images:
            failures.append(f'ロゴ画像数が不正: {len(logo_images)}（期待値 {expected_logo_images}）')
        page_results.append({'page': page_index + 1, 'a4': [round(page.rect.width / MM, 2), round(page.rect.height / MM, 2)], 'images': len(images), 'logoImages': len(logo_images), 'axisBottomPt': round(axis_bottom, 2) if axis_bottom is not None else None, 'legendTopPt': round(legend.y0, 2) if legend is not None else None, 'frameTopPt': round(frame, 2) if frame is not None else None, 'axisToLegendGapPt': round(gap_label, 2) if gap_label is not None else None, 'axisToFrameGapPt': round(gap_frame, 2) if gap_frame is not None else None, 'horseToPedigreeBorderGapPt': round(horse_border_gap, 2) if horse_border_gap is not None else None})
    page_count = len(document)
    document.close()
    results.append({'case': fixture['id'], 'kind': fixture['kind'], 'logo': fixture['logo'], 'pages': page_count, 'pass': not failures, 'failures': failures, 'layout': page_results})

(directory / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
summary = {'cases': len(results), 'passed': sum(item['pass'] for item in results), 'failed': [item for item in results if not item['pass']]}
print(json.dumps(summary, ensure_ascii=False, indent=2))
if not args.observe and any(not item['pass'] for item in results):
    raise SystemExit(1)
