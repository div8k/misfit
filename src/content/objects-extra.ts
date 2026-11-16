import type { GameObject, Measure } from '../engine/types.ts';
import { ball, inch, make } from './make.ts';

// FOURTH BATCH: familiar things, added 16 November 2026.
// Sizes were read from the cited pages that day (secondary sources). Product
// names identify the exact model whose published size is used; no logos are drawn.
// For the doll and the three trophies only the HEIGHT is documented; their width
// simply follows the simplified drawing, and the notes say so.

const f = (x: number) => +x.toFixed(2);
const o = (
  id: string, label: string, noun: string, widthMm: number, heightMm: number, measure: Measure,
  art: string, definition: string, sourceShortName: string, page: string, notes: string,
): GameObject =>
  ({ ...make({ id, label, noun, widthMm, heightMm, measure, art, definition, sourceShortName, notes,
    sourceTitle: `${decodeURIComponent(page).replace(/_/g, ' ')} — Wikipedia`, sourceUrl: `https://en.wikipedia.org/wiki/${page}` }), retrieved: '2026-11-16' });

const R = (w: number, h: number, rx: number) => `<rect width="${f(w)}" height="${f(h)}" rx="${f(rx)}"/>`;
const C = (x: number, y: number, w: number, h: number, rx = 1) => `<rect class="d" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}"/>`;
const P = (x: number, y: number, r: number, cls = 'd') => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
const L = (d: string, sw: number) => `<path class="ds" d="${d}" stroke-width="${sw}"/>`;
const coin = (d: number, motif: string) => ball(d, `<circle class="ds" cx="${f(d / 2)}" cy="${f(d / 2)}" r="${f(d * 0.43)}" stroke-width="${f(d * 0.03)}"/>` + motif);
/** Slab phone or tablet: body, screen, and a small camera pill. */
const slab = (w: number, h: number, rx: number, bezel: number) =>
  R(w, h, rx) + C(bezel, bezel, w - 2 * bezel, h - 2 * bezel, Math.max(1, rx - bezel)) + `<rect class="i" x="${f(w / 2 - w * 0.13)}" y="${f(bezel + h * 0.025)}" width="${f(w * 0.26)}" height="${f(h * 0.035)}" rx="${f(h * 0.0175)}"/>`;
/** Portrait sheet of paper with a folded corner. */
function sheet(w: number, h: number, t: number): string {
  const c = w * 0.19;
  const rows = [0.24, 0.34, 0.44, 0.54].map((k, i) => C(w * 0.13, h * k, w * (i === 3 ? 0.48 : 0.74), t, t / 2)).join('');
  return `<path d="M0 0H${f(w - c)}L${f(w)} ${f(c)}V${f(h)}H0Z"/>` + L(`M${f(w - c)} 0V${f(c)}H${f(w)}`, f(t * 0.45)) + rows;
}
const envelope = (w: number, h: number) => R(w, h, 2) + L(`M0 0L${f(w / 2)} ${f(h * 0.56)}L${f(w)} 0`, f(h * 0.018));
const photo = (w: number, h: number) =>
  R(w, h, 1) + C(w * 0.045, w * 0.045, w * 0.91, h - w * 0.09, 1) +
  `<path class="i" d="M${f(w * 0.045)} ${f(h - w * 0.045)}L${f(w * 0.34)} ${f(h * 0.45)}L${f(w * 0.53)} ${f(h * 0.73)}L${f(w * 0.68)} ${f(h * 0.51)}L${f(w * 0.955)} ${f(h - w * 0.045)}Z"/>` + P(w * 0.78, h * 0.27, h * 0.09, 'i');

const FB = { w: inch(11.125), h: f(inch(21.125) / Math.PI) };

export const EXTRA_OBJECTS: GameObject[] = [
  // ---------- phones, tablets, computers ----------
  o('iphone-se', 'iPhone SE (3rd gen)', 'iPhone SE', 67.3, 138.4, 'height',
    R(67.3, 138.4, 9) + C(4, 18, 59.3, 102, 1) + `<circle class="ds" cx="33.65" cy="129" r="5" stroke-width="1"/>`,
    'Apple iPhone SE, 3rd generation (the one with a home button).', 'iPhone SE (3rd gen) dimensions', 'IPhone_SE_(3rd_generation)', '138.4 × 67.3 mm. Height quoted.'),
  o('iphone-16-pm', 'iPhone 16 Pro Max', 'iPhone 16 Pro Max', 77.6, 163, 'height', slab(77.6, 163, 12, 3),
    'Apple iPhone 16 Pro Max.', 'iPhone 16 Pro Max dimensions', 'IPhone_16_Pro', '163.0 × 77.6 mm. Height quoted.'),
  o('ipad-mini', 'iPad mini (6th gen)', 'iPad mini', inch(5.31), inch(7.69), 'height', slab(inch(5.31), inch(7.69), 11, 8),
    'Apple iPad mini, 6th generation.', 'iPad mini (6th gen) dimensions', 'IPad_Mini_(6th_generation)', '7.69 × 5.31 in, i.e. about 195 × 135 mm. Height quoted.'),
  o('ipad-pro-13', 'iPad Pro 13-inch (M4)', 'iPad Pro', 215.5, 281.6, 'height', slab(215.5, 281.6, 13, 8),
    'Apple iPad Pro 13-inch with M4.', 'iPad Pro (M4) dimensions', 'IPad_Pro_(M4)', '281.6 × 215.5 mm. Height quoted.'),
  o('magic-keyboard', 'Apple Magic Keyboard', 'Magic Keyboard', 279, 114.9, 'width',
    R(279, 114.9, 7) + [9, 30, 51, 72, 93].map((y) => C(9, y, 261, 15, 3)).join(''),
    'Apple Magic Keyboard (compact, no number pad).', 'Magic Keyboard dimensions', 'Magic_Keyboard_(Mac)', '27.9 cm wide and 11.49 cm deep. Width quoted.'),
  o('mac-mini', 'Mac mini (2010–2023)', 'Mac mini', 196, 36, 'width', R(196, 36, 9) + P(176, 18, 3),
    'Apple Mac mini, unibody design of 2010–2023, seen from the front.', 'Mac mini dimensions', 'Mac_Mini', '196 × 196 × 36 mm. Width quoted.'),
  o('airtag', 'Apple AirTag', 'AirTag', 31.9, 31.9, 'diameter', ball(31.9, `<circle class="ds" cx="15.95" cy="15.95" r="10" stroke-width="0.9"/>`),
    'Apple AirTag tracker.', 'AirTag dimensions', 'AirTag', '31.9 mm in diameter.'),
  o('airpods-case', 'AirPods charging case', 'AirPods case', 44.3, 53.5, 'height', R(44.3, 53.5, 13) + L('M0 17H44.3', 0.9) + P(22.15, 27, 1.5),
    'Apple AirPods (2nd generation) charging case.', 'AirPods case dimensions', 'AirPods', '53.5 mm tall and 44.3 mm wide. Height quoted.'),
  o('homepod-mini', 'HomePod mini', 'HomePod mini', inch(3.9), inch(3.3), 'width',
    R(inch(3.9), inch(3.3), 38) + `<ellipse class="d" cx="49.5" cy="7" rx="24" ry="3.5"/>`,
    'Apple HomePod mini smart speaker.', 'HomePod mini dimensions', 'HomePod_Mini', '3.3 in tall and 3.9 in wide, i.e. about 84 × 99 mm. Width quoted.'),

  // ---------- games consoles and controllers ----------
  o('gba', 'Game Boy Advance', 'Game Boy Advance', 144.5, 82, 'width',
    R(144.5, 82, 22) + C(43, 15, 58.5, 41, 2) + P(21, 36, 9) + P(125, 32, 6) + P(113, 42, 6),
    'Nintendo Game Boy Advance, original 2001 model.', 'Game Boy Advance dimensions', 'Game_Boy_Advance', '144.5 × 82 mm. Width quoted.'),
  o('nintendo-3ds', 'Nintendo 3DS (closed)', 'Nintendo 3DS', 134, 74, 'width', R(134, 74, 9) + L('M0 8H134', 1.2) + P(67, 20, 2.5),
    'Nintendo 3DS, original model, closed.', 'Nintendo 3DS dimensions', 'Nintendo_3DS', '134 × 74 × 21 mm closed. Width quoted.'),
  o('ds-lite', 'Nintendo DS Lite (closed)', 'Nintendo DS Lite', 133, 73.9, 'width', R(133, 73.9, 7) + L('M0 7H133', 1.2) + C(58, 28, 17, 17, 2),
    'Nintendo DS Lite, closed.', 'Nintendo DS Lite dimensions', 'Nintendo_DS', '133 × 73.9 × 21.5 mm closed. Width quoted.'),
  o('switch-1', 'Nintendo Switch (original)', 'Nintendo Switch', 238, 102, 'width',
    R(238, 102, 14) + C(40, 6, 158, 90, 3) + P(20, 33, 9) + P(218, 62, 9) + P(20, 66, 4.5) + P(218, 30, 4.5),
    'Nintendo Switch, original 2017 model, with both Joy-Con attached.', 'Nintendo Switch dimensions', 'Nintendo_Switch', '238 × 102 mm with Joy-Con attached. Width quoted.'),
  o('psp', 'PlayStation Portable', 'PSP', 170, 74, 'width', R(170, 74, 30) + C(38, 10, 94, 54, 2) + P(19, 30, 8) + P(151, 30, 8),
    'Sony PlayStation Portable, PSP-1000.', 'PSP-1000 dimensions', 'PlayStation_Portable', '170 × 74 × 23 mm. Width quoted.'),
  o('ps-vita', 'PlayStation Vita', 'PS Vita', 182, 83.55, 'width', R(182, 83.55, 40) + C(37, 10, 108, 63.5, 2) + P(20, 32, 8) + P(162, 32, 8),
    'Sony PlayStation Vita, PCH-1000.', 'PS Vita dimensions', 'PlayStation_Vita', '182 × 83.55 mm. Width quoted.'),
  o('steam-deck', 'Steam Deck', 'Steam Deck', 298, 117, 'width',
    R(298, 117, 22) + C(66, 12, 166, 93, 3) + P(38, 38, 11) + P(260, 38, 11) + C(22, 68, 28, 28, 4) + C(248, 68, 28, 28, 4),
    'Valve Steam Deck handheld.', 'Steam Deck dimensions', 'Steam_Deck', '298 × 117 × 49 mm. Width quoted.'),
  o('ps5', 'PlayStation 5 console', 'PlayStation 5', 104, 390, 'height', R(104, 390, 16) + C(40, 12, 24, 366, 6),
    'Sony PlayStation 5, original 2020 model with disc drive, standing upright.', 'PlayStation 5 dimensions', 'PlayStation_5', '390 × 260 × 104 mm. Seen from the front standing up: 104 mm wide, 390 mm tall. Height quoted.'),
  o('xbox-series-x', 'Xbox Series X', 'Xbox Series X', 151, 301, 'height', R(151, 301, 4) + P(22, 22, 6) + C(18, 262, 52, 4, 2),
    'Microsoft Xbox Series X console, standing upright.', 'Xbox Series X dimensions', 'Xbox_Series_X_and_Series_S', '15.1 × 15.1 × 30.1 cm. Height quoted.'),
  o('xbox-series-s', 'Xbox Series S', 'Xbox Series S', 65, 275, 'height', R(65, 275, 3) + P(32.5, 62, 24) + P(12, 262, 3.5),
    'Microsoft Xbox Series S console, standing upright.', 'Xbox Series S dimensions', 'Xbox_Series_X_and_Series_S', '15.1 × 6.5 × 27.5 cm. Seen from the front standing up. Height quoted.'),
  o('gamecube-controller', 'GameCube controller', 'GameCube controller', 140, 100, 'width',
    '<path d="M32 6H108a22 22 0 0 1 20 14L140 78a14 14 0 0 1-27 9L100 62H40L27 87a14 14 0 0 1-27-9L12 20A22 22 0 0 1 32 6Z"/>' + P(36, 28, 9) + P(104, 30, 9) + P(88, 52, 6) + P(52, 52, 6),
    'Nintendo GameCube controller.', 'GameCube controller dimensions', 'GameCube_controller', '140 mm wide and 100 mm deep. Width quoted. The outline is simplified.'),
  o('dualshock', 'PlayStation DualShock controller', 'DualShock controller', 157, 95, 'width',
    '<path d="M30 4H127a20 20 0 0 1 19 13L157 76a13 13 0 0 1-25 8L118 56H39L25 84a13 13 0 0 1-25-8L11 17A20 20 0 0 1 30 4Z"/>' + P(56, 50, 9) + P(101, 50, 9) + P(30, 26, 7) + P(127, 26, 7),
    'Sony DualShock controller (original PlayStation).', 'DualShock dimensions', 'DualShock', 'Body 157 × 95 × 55 mm. Width quoted. The outline is simplified.'),

  // ---------- money ----------
  o('cad-quarter', 'Canadian quarter', 'Canadian quarter', 23.88, 23.88, 'diameter', coin(23.88, '<path class="d" d="M7 9L11.94 16L16.88 9L11.94 12.5Z"/>'),
    'Canadian 25-cent coin.', 'Canadian quarter specification', 'Quarter_(Canadian_coin)', '23.88 mm in diameter.'),
  o('cad-dime', 'Canadian dime', 'Canadian dime', 18.03, 18.03, 'diameter', coin(18.03, '<path class="d" d="M9 4.5L13 12H5.2Z"/>' + C(5, 12.6, 8, 1.2, 0.4)),
    'Canadian 10-cent coin.', 'Canadian dime specification', 'Dime_(Canadian_coin)', '18.03 mm in diameter.'),
  o('cad-nickel', 'Canadian nickel', 'Canadian nickel', 21.2, 21.2, 'diameter', coin(21.2, '<ellipse class="d" cx="10.6" cy="11.4" rx="5.4" ry="3.2"/>'),
    'Canadian 5-cent coin.', 'Canadian nickel specification', 'Nickel_(Canadian_coin)', '21.2 mm in diameter.'),
  o('us-dollar-coin', 'US dollar coin', 'US dollar coin', 26.49, 26.49, 'diameter', coin(26.49, P(13.245, 13.245, 5) + P(13.245, 13.245, 2.4, 'i')),
    'United States golden dollar coin (Sacagawea size, also used for later dollar coins).', 'US dollar coin specification', 'Sacagawea_dollar', '26.49 mm in diameter.'),
  o('cad-5-note', 'Canadian $5 note', 'Canadian five-dollar note', 152.4, 69.85, 'width', R(152.4, 69.85, 1) + C(98, 8, 26, 54, 8) + P(44, 35, 17),
    'Canadian polymer five-dollar banknote.', 'Bank of Canada note size', 'Canadian_five-dollar_note', '152.4 × 69.85 mm. All current Canadian notes share this size. Width quoted.'),
  o('playing-card', 'Playing card (poker size)', 'playing card', 63, 88, 'height',
    R(63, 88, 4) + '<polygon class="d" points="31.5,26 44,44 31.5,62 19,44"/>' + P(9, 10, 3) + P(54, 78, 3),
    'Poker-size playing card.', 'Poker-size playing card', 'Standard_52-card_deck', '88 × 63 mm (US makers quote 3.5 × 2.5 in). Height quoted.'),

  // ---------- paper ----------
  o('a3-sheet', 'A3 sheet of paper', 'A3 sheet', 297, 420, 'height', sheet(297, 420, 8),
    'ISO 216 A3 sheet, portrait: two A4 sheets side by side.', 'ISO 216 (A3)', 'International_standard_paper_sizes', '297 × 420 mm. Height quoted.'),
  o('dl-envelope', 'DL envelope', 'DL envelope', 220, 110, 'width', envelope(220, 110),
    'ISO DL envelope, the common business-letter size.', 'ISO 269 (DL)', 'Envelope', '110 × 220 mm. Width quoted.'),
  o('c5-envelope', 'C5 envelope', 'C5 envelope', 229, 162, 'width', envelope(229, 162),
    'ISO C5 envelope, which holds an A5 sheet.', 'ISO 269 (C5)', 'Envelope', '162 × 229 mm. Width quoted.'),
  o('photo-8r', '8 × 12 in photo print', 'large photo print', 305, 203, 'width', photo(305, 203),
    '8R photographic print.', 'Photo print 8R', 'Photo_print_sizes', '203 × 305 mm. Long side quoted.'),
  o('microsd', 'microSD card', 'microSD card', 11, 15, 'height', '<path d="M0.8 0H8.4L11 2.6V14.2a0.8 0.8 0 0 1-0.8 0.8H0.8a0.8 0.8 0 0 1-0.8-0.8V0.8a0.8 0.8 0 0 1 0.8-0.8Z"/>' + C(2, 6, 7, 5, 0.6),
    'microSD memory card.', 'SD Association (microSD)', 'SD_card', '15 × 11 × 1 mm. Height quoted.'),

  // ---------- toys and sport ----------
  o('rubiks-cube', "Rubik's Cube", "Rubik's Cube", 56, 56, 'width', R(56, 56, 3) + L('M18.67 0V56M37.33 0V56M0 18.67H56M0 37.33H56', 2.2),
    "Standard 3×3 Rubik's Cube.", "Rubik's Cube size", 'Rubik%27s_Cube', '5.6 cm on each side.'),
  o('barbie', 'Barbie doll', 'Barbie doll', 76, inch(11.5), 'height',
    '<circle cx="38" cy="18" r="17"/><path d="M28 34H48L55 92L72 200H57L52 292.1H42L38 206L34 292.1H24L19 200H4L21 92Z"/>' + L('M21 92H55', 2),
    'Standard Barbie fashion doll.', 'Barbie doll height', 'Barbie', 'A standard doll is 11.5 in (about 29.2 cm) tall. Only the height is documented; the width follows this simplified drawing.'),
  o('american-football', 'American football (NFL)', 'American football', FB.w, FB.h, 'width',
    `<path d="M0 ${f(FB.h / 2)}Q${f(FB.w / 2)} ${f(-FB.h / 2)} ${f(FB.w)} ${f(FB.h / 2)}Q${f(FB.w / 2)} ${f(FB.h * 1.5)} 0 ${f(FB.h / 2)}Z"/>` + L(`M105 ${f(FB.h / 2)}H178M115 78V92M128 78V92M141 78V92M154 78V92M167 78V92`, 3),
    'Professional (NFL) American football.', 'NFL ball dimensions', 'American_football', 'A RANGE: long axis 11 to 11¼ in (about 28.3 cm); short circumference 21 to 21¼ in. Mid-range is used. Length quoted.'),
  o('rugby-ball', 'Rugby ball (size 5)', 'rugby ball', 290, 191, 'width', '<ellipse cx="145" cy="95.5" rx="145" ry="95.5"/>' + L('M16 95.5Q145 58 274 95.5', 3),
    'Regulation rugby union ball.', 'World Rugby ball dimensions', 'Rugby_ball', 'A RANGE: 28–30 cm long, 58–62 cm around at the widest point. Mid-range is used. Length quoted.'),
  o('basketball-hoop', 'Basketball hoop (rim)', 'basketball hoop', inch(18), inch(18), 'diameter', ball(inch(18), P(228.6, 228.6, 206)),
    'Basketball rim, seen from above.', 'Basketball rim diameter', 'Backboard_(basketball)', '18 in (457 mm) in diameter: nearly twice as wide as the ball.'),

  // ---------- big things ----------
  o('oil-drum', '55-gallon drum', 'oil drum', 610, 880, 'height', R(610, 880, 14) + C(0, 285, 610, 20, 0) + C(0, 585, 610, 20, 0),
    'Standard 208-litre (55 US gallon) steel drum.', '208 L drum dimensions', 'Drum_(container)', 'Nominally just under 880 mm tall and just under 610 mm across. Height quoted.'),
  o('keg', 'Beer keg (half barrel)', 'beer keg', inch(16.1), inch(23.3), 'height',
    R(inch(16.1), inch(23.3), 42) + C(0, 190, inch(16.1), 16, 0) + C(0, 390, inch(16.1), 16, 0) + C(110, 26, 70, 24, 12) + C(229, 26, 70, 24, 12),
    'US half-barrel beer keg (15.5 US gallons).', 'US half-barrel keg', 'Keg', '23.3 in tall and at least 16.1 in across, i.e. about 59 × 41 cm. Height quoted.'),
  o('pallet', 'Shipping pallet (48 × 40 in)', 'shipping pallet', inch(48), inch(40), 'width',
    R(inch(48), inch(40), 4) + [150, 330, 510, 690, 866].map((y) => C(0, y, inch(48), 40, 0)).join(''),
    'Standard North American (GMA) pallet, seen from above.', 'GMA pallet (48 × 40 in)', 'Pallet', '48 × 40 in, i.e. about 122 × 102 cm. Width quoted.'),
  o('world-cup-trophy', 'FIFA World Cup Trophy', 'World Cup trophy', 130, 368, 'height',
    '<circle cx="65" cy="66" r="62"/><path d="M28 108Q66 200 40 304H90Q64 200 102 108Z"/>' + '<rect x="27" y="300" width="76" height="68" rx="6"/>' + C(27, 322, 76, 8, 0) + C(27, 342, 76, 8, 0),
    'FIFA World Cup Trophy (in use since 1974).', 'FIFA World Cup Trophy height', 'FIFA_World_Cup_Trophy', '36.8 cm tall. Only the height is documented; the width follows this simplified drawing.'),
  o('lombardi-trophy', 'Super Bowl trophy', 'Super Bowl trophy', 240, inch(22), 'height',
    '<ellipse cx="120" cy="96" rx="62" ry="96"/><path d="M70 178H170L206 558.8H34Z"/>' + L('M120 30V160', 3),
    'Vince Lombardi Trophy, awarded to the Super Bowl winner.', 'Vince Lombardi Trophy height', 'Vince_Lombardi_Trophy', '22 in (about 56 cm) tall. Only the height is documented; the width follows this simplified drawing.'),
  o('stanley-cup', 'Stanley Cup', 'Stanley Cup', 440, inch(35.25), 'height',
    '<path d="M108 0H332L300 150H140Z"/><rect x="160" y="146" width="120" height="78"/><rect x="60" y="220" width="320" height="644" rx="10"/><rect x="0" y="858" width="440" height="37.35" rx="6"/>' + [340, 470, 600, 730].map((y) => C(60, y, 320, 9, 0)).join(''),
    'Stanley Cup, the NHL championship trophy.', 'Stanley Cup height', 'Stanley_Cup', '35¼ in (89.5 cm) tall. Only the height is documented; the width follows this simplified drawing.'),
];
