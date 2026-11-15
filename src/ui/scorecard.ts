import { BANDS, bandIndex, TAGLINE } from '../engine/share.ts';

export interface CardData {
  edition: number;
  dateLabel: string;
  score: number;
  max: number;
  /** e.g. "3/5 spotted" */
  detail: string;
  /** Percent of maximum for each round. Abstract marks only: no answers. */
  percents: number[];
  host: string;
}

const C = { paper: '#F7F3E8', surface: '#FFFDF7', ink: '#202322', muted: '#5C625D', line: '#D6D0C3', blue: '#234BE0' };
const DISPLAY = '"Bricolage Grotesque Variable", Arial, sans-serif';
const BODY = '"DM Sans Variable", system-ui, sans-serif';
const BAND_FILL = [C.blue, '#216548', '#8A6A00', C.line];

/**
 * Draws the 1080×1350 score card with local fonts and shapes only.
 * It receives totals and band percentages, never object names or measurements.
 */
export async function drawScoreCard(d: CardData): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas is unavailable');
  try {
    await Promise.all([document.fonts.load(`800 100px ${DISPLAY}`), document.fonts.load(`600 40px ${BODY}`)]);
  } catch {
    /* fall back to system fonts */
  }

  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  g.fillStyle = C.surface;
  g.strokeStyle = C.ink;
  g.lineWidth = 6;
  g.beginPath();
  g.roundRect(60, 60, W - 120, H - 120, 48);
  g.fill();
  g.stroke();

  g.textBaseline = 'alphabetic';
  g.fillStyle = C.ink;
  g.font = `800 112px ${DISPLAY}`;
  g.fillText('MISFIT', 130, 240);
  g.font = `600 40px ${BODY}`;
  g.fillStyle = C.muted;
  g.textAlign = 'right';
  g.fillText(`#${d.edition}`, W - 130, 200);
  g.fillText(d.dateLabel, W - 130, 250);
  g.textAlign = 'left';

  g.fillStyle = C.blue;
  g.font = `800 300px ${DISPLAY}`;
  const scoreText = String(d.score);
  g.fillText(scoreText, 120, 640);
  const sw = g.measureText(scoreText).width;
  g.fillStyle = C.ink;
  g.font = `700 84px ${DISPLAY}`;
  g.fillText(`/ ${d.max}`, 120 + sw + 28, 640);
  g.font = `600 52px ${BODY}`;
  g.fillStyle = C.ink;
  g.fillText(d.detail, 130, 740);

  // Five abstract round marks: a frame per round, filled to the round's share of its maximum.
  const n = d.percents.length;
  const gap = 28;
  const size = Math.min(150, (W - 260 - gap * (n - 1)) / n);
  d.percents.forEach((p, i) => {
    const x = 130 + i * (size + gap);
    const y = 840;
    const fillH = Math.max(0, Math.min(1, p / 100)) * size;
    g.save();
    g.beginPath();
    g.roundRect(x, y, size, size, 22);
    g.clip();
    g.fillStyle = C.paper;
    g.fillRect(x, y, size, size);
    g.fillStyle = BAND_FILL[bandIndex(p)];
    g.fillRect(x, y + size - fillH, size, fillH);
    g.restore();
    g.strokeStyle = C.ink;
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(x, y, size, size, 22);
    g.stroke();
    g.fillStyle = C.muted;
    g.font = `600 30px ${BODY}`;
    g.textAlign = 'center';
    g.fillText(BANDS[bandIndex(p)].name, x + size / 2, y + size + 46);
    g.textAlign = 'left';
  });

  g.fillStyle = C.ink;
  g.font = `700 60px ${DISPLAY}`;
  g.fillText(TAGLINE, 130, 1160);
  g.fillStyle = C.muted;
  g.font = `500 38px ${BODY}`;
  g.fillText(d.host, 130, 1224);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the card'))), 'image/png'));
}
