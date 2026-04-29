import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { GlobalFonts, createCanvas, loadImage } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const pdfPath = process.argv[2] || 'C:\\Users\\jkhor\\Desktop\\Hamagiku Farm\\ReportApp\\Hama Office Paper.pdf';
const outputPath = process.argv[3] || path.join(frontendDir, 'public', 'hama-paper-actual-overlay-preview.png');
const debugMode = process.argv.includes('--debug');

const mm = (value) => Math.round(value * (300 / 25.4));
const pageWidth = mm(210);
const pageHeight = mm(297);

const colors = {
  brand: '#1a3c34',
  accent: '#c5a059',
  lightFill: '#f4f7f6',
  ownerFill: '#f9fbfa',
  lightBorder: '#d1d5db',
  text: '#111111',
  muted: '#666666',
  commentBorder: '#555555',
};

function registerFonts() {
  const candidates = [
    'C:\\Windows\\Fonts\\NotoSerifJP-Regular.otf',
    'C:\\Windows\\Fonts\\NotoSerifJP-SemiBold.otf',
    'C:\\Windows\\Fonts\\YuMincho.ttc',
    'C:\\Windows\\Fonts\\msgothic.ttc',
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\times.ttf',
    'C:\\Windows\\Fonts\\georgia.ttf',
  ];

  for (const fontPath of candidates) {
    try {
      GlobalFonts.registerFromPath(fontPath);
    } catch (_) {
      // ignore missing fonts
    }
  }
}

function fillText(ctx, text, x, y, options = {}) {
  const {
    font = '28px sans-serif',
    color = colors.text,
    align = 'left',
    baseline = 'alphabetic',
    maxWidth,
  } = options;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  const lines = String(text || '').split(/\s+/);
  const output = [];
  let current = '';
  ctx.save();
  ctx.font = options.font || '16px sans-serif';
  for (const word of lines) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !current) {
      current = trial;
    } else {
      output.push(current);
      current = word;
    }
  }
  if (current) output.push(current);
  ctx.restore();

  output.forEach((line, index) => {
    fillText(ctx, line, x, y + (index * lineHeight), options);
  });
}

async function renderPdfPage() {
  const bytes = await fs.readFile(pdfPath);
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 300 / 72 });
  const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function drawOverlay(baseCanvas) {
  registerFonts();
  const canvas = createCanvas(pageWidth, pageHeight);
  const ctx = canvas.getContext('2d');
  if (debugMode) {
    ctx.globalAlpha = 0.6;
  }
  ctx.drawImage(baseCanvas, 0, 0, pageWidth, pageHeight);
  ctx.globalAlpha = 1;

  const leftPad = mm(8.5);
  const rightPad = pageWidth - mm(8.5);

  const overlay = {
    headerY: mm(48),
    horseNameY: mm(66),
    horseNameSubY: mm(76),
    pedigreeX: mm(134),
    pedigreeY: mm(77),
    ownerY: mm(92.5),
    photoX: mm(39),
    photoY: mm(100),
    photoW: mm(127.5),
    photoH: mm(95.6),
    dataY: mm(202),
  };

  const accentColor = debugMode ? '#2563eb' : colors.accent;
  const brandColor = debugMode ? '#0f172a' : colors.brand;
  const fillColor = debugMode ? 'rgba(37,99,235,0.08)' : colors.lightFill;
  const ownerFillColor = debugMode ? 'rgba(15,23,42,0.05)' : colors.ownerFill;
  const ownerBorderColor = debugMode ? '#2563eb' : colors.lightBorder;
  const commentBorderColor = debugMode ? '#2563eb' : colors.commentBorder;

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftPad, overlay.headerY);
  ctx.lineTo(rightPad, overlay.headerY);
  ctx.stroke();

  fillText(ctx, 'HAMAGIKU', leftPad, mm(31), {
    font: 'bold 30px Times New Roman',
    color: brandColor,
  });
  fillText(ctx, 'FARM', leftPad, mm(40), {
    font: 'bold 30px Times New Roman',
    color: brandColor,
  });

  fillText(ctx, '月次レポート', rightPad, mm(31), {
    font: '600 30px Noto Serif JP',
    color: brandColor,
    align: 'right',
  });
  fillText(ctx, '2026年4月', rightPad, mm(39), {
    font: '16px Times New Roman',
    color: '#6b7280',
    align: 'right',
  });

  fillText(ctx, 'ティエムスピード', leftPad, overlay.horseNameY, {
    font: '700 42px Noto Serif JP',
    color: '#1f2937',
  });
  fillText(ctx, 'TM Speed', leftPad, overlay.horseNameSubY, {
    font: 'bold 20px Times New Roman',
    color: accentColor,
  });

  ctx.fillStyle = fillColor;
  ctx.fillRect(overlay.pedigreeX, mm(67), mm(67), mm(13));
  ctx.fillStyle = brandColor;
  ctx.fillRect(overlay.pedigreeX, mm(67), mm(0.8), mm(13));
  fillText(ctx, '父: ステルヴィオ  ×  母: ティエムメロディ', overlay.pedigreeX + mm(3), overlay.pedigreeY, {
    font: '600 16px Noto Serif JP',
    color: colors.muted,
  });

  ctx.fillStyle = ownerFillColor;
  ctx.strokeStyle = ownerBorderColor;
  ctx.lineWidth = 1;
  ctx.fillRect(leftPad, mm(85), pageWidth - leftPad - mm(8.5), mm(9));
  ctx.strokeRect(leftPad, mm(85), pageWidth - leftPad - mm(8.5), mm(9));

  fillText(ctx, '馬主: 竹園 正継様', leftPad + mm(2), overlay.ownerY, {
    font: '600 14px Noto Serif JP',
    color: '#444444',
  });
  fillText(ctx, '調教師: 鈴木 孝志 様 (栗東)', leftPad + mm(32), overlay.ownerY, {
    font: '600 14px Noto Serif JP',
    color: '#444444',
  });
  fillText(ctx, '生年月日: 2024-02-19', leftPad + mm(78), overlay.ownerY, {
    font: '600 14px Noto Serif JP',
    color: '#444444',
  });
  fillText(ctx, '性別・年齢: 牝2歳', leftPad + mm(114), overlay.ownerY, {
    font: '600 14px Noto Serif JP',
    color: '#444444',
  });

  const samplePhotoPath = path.join(frontendDir, 'public', 'sample-horse-photo.jpg');
  try {
    const photo = await loadImage(samplePhotoPath);
    ctx.drawImage(photo, overlay.photoX, overlay.photoY, overlay.photoW, overlay.photoH);
  } catch (_) {
    ctx.fillStyle = '#efefef';
    ctx.fillRect(overlay.photoX, overlay.photoY, overlay.photoW, overlay.photoH);
  }

  const boxY = mm(266);
  ctx.strokeStyle = commentBorderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(leftPad, boxY, pageWidth - leftPad - mm(8.5), mm(19));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(leftPad + mm(5), boxY - mm(2.2), mm(24), mm(4));
  fillText(ctx, 'TRAINER’S COMMENT', leftPad + mm(6), boxY - mm(0.3), {
    font: 'bold 13px Times New Roman',
    color: brandColor,
    baseline: 'middle',
  });
  drawWrappedText(
    ctx,
    '順調に調整できています。坂路では無理をさせず、終いの反応を見ながら進めています。気持ちの面も落ち着いており、日々のコンディションは安定しています。',
    leftPad + mm(4),
    boxY + mm(5),
    pageWidth - leftPad - mm(18),
    mm(4.8),
    { font: '600 13px Noto Serif JP', color: colors.text }
  );

  return canvas;
}

async function main() {
  const pdfCanvas = await renderPdfPage();
  const canvas = await drawOverlay(pdfCanvas);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, canvas.toBuffer('image/png'));
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
