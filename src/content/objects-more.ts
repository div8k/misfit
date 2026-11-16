import type { GameObject, Measure } from '../engine/types.ts';
import { ball, inch, make } from './make.ts';

// SECOND BATCH OF OBJECTS
// -----------------------
// Added 15 November 2026. Each size below was read from the cited page that day
// (secondary source: a Wikipedia summary of the relevant standard or rule book).
// Candidates whose page gave no clear figure, or only a rough one (softball,
// playing card, 8-track cartridge, rugby ball and others), were left out rather
// than guessed. All drawings are original and authored in millimetres.

const f = (x: number) => +x.toFixed(2);
const wiki = (title: string) => `https://en.wikipedia.org/wiki/${title}`;

function obj(
  id: string,
  label: string,
  noun: string,
  widthMm: number,
  heightMm: number,
  measure: Measure,
  art: string,
  definition: string,
  sourceShortName: string,
  page: string,
  notes: string,
): GameObject {
  return make({
    id,
    label,
    noun,
    widthMm,
    heightMm,
    measure,
    art,
    definition,
    sourceShortName,
    sourceTitle: `${page.replace(/_/g, ' ')} — Wikipedia`,
    sourceUrl: wiki(page),
    notes,
  });
}

// ---- drawing helpers ----
const ring = (d: number, k: number, sw: number) => `<circle class="ds" cx="${f(d / 2)}" cy="${f(d / 2)}" r="${f((d / 2) * k)}" stroke-width="${sw}"/>`;
const dot = (x: number, y: number, r: number, cls = 'd') => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;

/** Coin: rim line plus one simple original motif so coins differ from each other. */
function coin(d: number, motif: string): string {
  return ball(d, ring(d, 0.86, f(d * 0.03)) + motif);
}
function star(c: number, R: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 ? R * 0.42 : R;
    pts.push(`${f(c + r * Math.cos(a))},${f(c + r * Math.sin(a))}`);
  }
  return `<polygon class="d" points="${pts.join(' ')}"/>`;
}
/** Upright cylindrical cell with a terminal nub and one band. */
function cell(w: number, h: number): string {
  const nub = w * 0.36;
  return `<rect x="${f((w - nub) / 2)}" width="${f(nub)}" height="${f(h * 0.06)}" rx="${f(nub * 0.18)}"/><rect y="${f(h * 0.032)}" width="${w}" height="${f(h * 0.968)}" rx="${f(w * 0.11)}"/><rect class="d" y="${f(h * 0.19)}" width="${w}" height="${f(h * 0.027)}"/>`;
}
const rect = (w: number, h: number, rx: number) => `<rect width="${f(w)}" height="${f(h)}" rx="${rx}"/>`;
const cut = (x: number, y: number, w: number, h: number, rx = 1) => `<rect class="d" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}"/>`;
const line = (d: string, sw: number) => `<path class="ds" d="${d}" stroke-width="${sw}"/>`;
/** Banknote with a window band and an arch, unlike the dollar bill's oval. */
function euroNote(w: number, h: number): string {
  return (
    rect(w, h, 1) +
    cut(w * 0.08, 0, w * 0.1, h, 0) +
    `<path class="d" d="M${f(w * 0.36)} ${f(h * 0.86)}V${f(h * 0.46)}a${f(w * 0.13)} ${f(w * 0.13)} 0 0 1 ${f(w * 0.26)} 0V${f(h * 0.86)}Z"/>` +
    dot(w * 0.82, h * 0.3, h * 0.12)
  );
}

const D = {
  quarter: 24.26,
  penny: 19.05,
  nickel: 21.21,
  half: 30.61,
  dime: 17.91,
  euro1: 23.25,
  euro2: 25.75,
  squash: 40,
  cricket: 72,
  pickle: 74.2,
  racquet: 57,
  snooker: 52.5,
  carom: 61.5,
  volley: 210,
  soccer: 220,
  handball: 188,
  bowling: 217,
  netball: 220,
  dart: 451,
  laser: 300,
  ten: inch(10),
};

export const MORE_OBJECTS: GameObject[] = [
  // ---------- coins ----------
  obj('us-quarter', 'US quarter', 'US quarter', D.quarter, D.quarter, 'diameter',
    coin(D.quarter, `<path class="d" d="M5.5 10.5L12.13 16.5L18.76 10.5L12.13 13.2Z"/>`),
    'United States quarter dollar (25-cent coin).', 'US quarter specification', 'Quarter_(United_States_coin)', '0.955 in, 24.26 mm in diameter.'),
  obj('us-penny', 'US penny', 'US penny', D.penny, D.penny, 'diameter',
    coin(D.penny, cut(6.8, 6, 5.45, 7, 1.2)),
    'United States one-cent coin.', 'US cent specification', 'Penny_(United_States_coin)', '0.75 in, 19.05 mm in diameter.'),
  obj('us-nickel', 'US nickel', 'US nickel', D.nickel, D.nickel, 'diameter',
    coin(D.nickel, `<path class="d" d="M5.6 13.2a5 5 0 0 1 10 0Z"/>`),
    'United States five-cent coin (1883 onward size).', 'US nickel specification', 'Nickel_(United_States_coin)', '21.21 mm in diameter.'),
  obj('us-half-dollar', 'US half dollar', 'US half dollar', D.half, D.half, 'diameter',
    coin(D.half, star(D.half / 2, 6.5)),
    'United States half dollar (50-cent coin).', 'US half dollar specification', 'Half_dollar_(United_States_coin)', '1.205 in, 30.61 mm in diameter.'),
  obj('us-dime', 'US dime', 'US dime', D.dime, D.dime, 'diameter',
    coin(D.dime, cut(8.25, 4.6, 1.4, 8.6, 0.5) + dot(8.955, 4.4, 1.3)),
    'United States ten-cent coin.', 'US dime specification', 'Dime_(United_States_coin)', '0.705 in, 17.91 mm in diameter. Smaller than the penny despite being worth more.'),
  obj('euro-1', '€1 coin', 'one-euro coin', D.euro1, D.euro1, 'diameter',
    ball(D.euro1, ring(D.euro1, 0.68, 0.9) + cut(10.9, 7.2, 1.5, 8.8, 0.4)),
    'Euro one-euro coin (bimetallic).', '€1 coin specification', '1_euro_coin', '23.25 mm in diameter.'),
  obj('euro-2', '€2 coin', 'two-euro coin', D.euro2, D.euro2, 'diameter',
    ball(D.euro2, ring(D.euro2, 0.72, 0.9) + cut(10.3, 8.2, 1.5, 9.4, 0.4) + cut(14, 8.2, 1.5, 9.4, 0.4)),
    'Euro two-euro coin (bimetallic).', '€2 coin specification', '2_euro_coin', '25.75 mm in diameter.'),

  // ---------- batteries ----------
  obj('aaa-battery', 'AAA battery', 'AAA battery', 10.5, 44.5, 'height', cell(10.5, 44.5),
    'IEC 60086 size R03 / LR03 cylindrical cell ("AAA"), including the terminal.', 'IEC 60086 (LR03)', 'AAA_battery', '44.5 mm long including the positive terminal, 10.5 mm in diameter.'),
  obj('c-battery', 'C battery', 'C battery', 26.2, 50, 'height', cell(26.2, 50),
    'IEC 60086 size R14 / LR14 cylindrical cell ("C").', 'IEC 60086 (LR14)', 'C_battery', '50 mm long and 26.2 mm in diameter. The same length as an AA cell is, within half a millimetre, but far fatter.'),
  obj('d-battery', 'D battery', 'D battery', 33.2, 61.5, 'height', cell(33.2, 61.5),
    'IEC 60086 size R20 / LR20 cylindrical cell ("D").', 'IEC 60086 (LR20)', 'D_battery', 'Overall length 61.5 mm; nominal diameter 33.2 mm, give or take a millimetre.'),

  // ---------- balls ----------
  obj('squash-ball', 'Squash ball', 'squash ball', D.squash, D.squash, 'diameter',
    ball(D.squash, dot(17.3, 20, 1.6) + dot(22.7, 20, 1.6)),
    'Competition squash ball (World Squash specification).', 'World Squash ball specification', 'Squash_(sport)', 'A RANGE: 39.5–40.5 mm. 40 mm is used.'),
  obj('cricket-ball', 'Cricket ball', 'cricket ball', D.cricket, D.cricket, 'diameter',
    ball(D.cricket, line('M32.5 1.5V70.5M39.5 1.5V70.5', 1.1) + `<path class="ds" d="M29.5 3V69M42.5 3V69" stroke-width="2.6" stroke-dasharray="1.1 2.6"/>`),
    'Men’s cricket ball under the Laws of Cricket.', 'Laws of Cricket (Law 4)', 'Cricket_ball',
    `A RANGE: circumference 8.81–9 in, i.e. about ${(inch(8.81) / Math.PI).toFixed(1)}–${(inch(9) / Math.PI).toFixed(1)} mm across. 72 mm (mid-range) is used.`),
  obj('pickleball', 'Pickleball', 'pickleball', D.pickle, D.pickle, 'diameter',
    ball(D.pickle, [[37.1, 37.1], [37.1, 17], [37.1, 57.2], [17, 37.1], [57.2, 37.1], [22.5, 22.5], [51.7, 22.5], [22.5, 51.7], [51.7, 51.7]].map(([x, y]) => dot(x, y, 3.6)).join('')),
    'Pickleball approved under USA Pickleball rules.', 'USA Pickleball equipment rules', 'Pickleball',
    `A RANGE: 2.87–2.97 in, i.e. ${inch(2.87).toFixed(1)}–${inch(2.97).toFixed(1)} mm. 74.2 mm (mid-range) is used.`),
  obj('racquetball', 'Racquetball', 'racquetball', D.racquet, D.racquet, 'diameter',
    ball(D.racquet, line('M13 21A17 17 0 0 1 26 11', 2.4)),
    'Standard racquetball.', 'Racquetball equipment rules', 'Racquetball', '2.25 in, given as 57 mm.'),
  obj('snooker-ball', 'Snooker ball', 'snooker ball', D.snooker, D.snooker, 'diameter',
    ball(D.snooker, line('M11.5 20A16 16 0 0 1 22 10', 2.2) + line('M30 46A20 20 0 0 0 45 33', 1.2)),
    'Full-size snooker ball.', 'Snooker ball specification', 'Billiard_ball', '52.5 mm (2 1/16 in). Noticeably smaller than an American pool ball.'),
  obj('carom-ball', 'Carom billiard ball', 'carom ball', D.carom, D.carom, 'diameter',
    ball(D.carom, dot(30.75, 30.75, 2.6) + ring(D.carom, 0.3, 0.9)),
    'Carom billiards ball.', 'Carom ball specification', 'Billiard_ball', '61.5 mm (2 7/16 in). Larger than a pool ball.'),
  obj('volleyball', 'Volleyball (indoor)', 'volleyball', D.volley, D.volley, 'diameter',
    ball(D.volley, line('M105 0C70 60 70 150 105 210M12 62C70 80 150 70 196 52M20 160C80 130 150 140 190 170', 3.6)),
    'Standard indoor volleyball.', 'FIVB ball specification', 'Volleyball_(ball)',
    `A RANGE: circumference 65–67 cm, i.e. about ${(650 / Math.PI).toFixed(0)}–${(670 / Math.PI).toFixed(0)} mm across. 210 mm (mid-range) is used.`),
  obj('soccer-ball', 'Football (size 5)', 'football', D.soccer, D.soccer, 'diameter',
    ball(D.soccer, `<polygon class="d" points="110,78 140.4,100.1 128.8,135.9 91.2,135.9 79.6,100.1"/>` + line('M110 78V22M140.4 100.1L194 82M128.8 135.9L162 182M91.2 135.9L58 182M79.6 100.1L26 82', 3.6)),
    'Regulation association football (soccer ball), size 5.', 'IFAB Laws of the Game (Law 2)', 'Ball_(association_football)', 'A RANGE: 21.6–22.3 cm in diameter (circumference 68–70 cm). 22.0 cm is used.'),
  obj('handball', 'Handball (size 3)', 'handball', D.handball, D.handball, 'diameter',
    ball(D.handball, line('M0 94H188M94 0C60 50 60 138 94 188M94 0C128 50 128 138 94 188', 3.2)),
    'IHF size III handball (men over 16).', 'IHF ball sizes (size III)', 'Handball',
    `A RANGE: circumference 58–60 cm, i.e. about ${(580 / Math.PI).toFixed(0)}–${(600 / Math.PI).toFixed(0)} mm across. 188 mm (mid-range) is used.`),
  obj('bowling-ball', 'Tenpin bowling ball', 'bowling ball', D.bowling, D.bowling, 'diameter',
    ball(D.bowling, dot(92, 70, 9) + dot(124, 70, 9) + dot(108.5, 104, 10.5)),
    'Regulation tenpin bowling ball under USBC specifications.', 'USBC equipment specifications', 'Bowling_ball',
    `A RANGE: 8.500–8.595 in, i.e. ${inch(8.5).toFixed(1)}–${inch(8.595).toFixed(1)} mm. 217 mm is used.`),
  obj('netball', 'Netball (size 5)', 'netball', D.netball, D.netball, 'diameter',
    ball(D.netball, line('M30 40C90 90 130 90 190 40M30 180C90 130 130 130 190 180M110 0V220', 3.6)),
    'Regulation netball.', 'World Netball rules', 'Netball', 'About 22 cm in diameter (circumference 680–710 mm).'),
  obj('hockey-puck', 'Ice hockey puck', 'hockey puck', inch(3), inch(1), 'width',
    rect(inch(3), inch(1), 2.5) + line('M0 5.5H76.2M0 19.9H76.2', 0.9),
    'Standard ice hockey puck, seen from the side.', 'Ice hockey puck specification', 'Hockey_puck', '3 in (76.2 mm) in diameter and 1 in (25.4 mm) thick. Diameter quoted.'),
  obj('dartboard', 'Dartboard', 'dartboard', D.dart, D.dart, 'diameter',
    ball(D.dart, ring(D.dart, 0.75, 9) + ring(D.dart, 0.47, 9) + dot(225.5, 225.5, 16) + line('M225.5 20V431M20 225.5H431M80 80L371 371M371 80L80 371', 2.4)),
    'Regulation bristle dartboard.', 'Darts Regulation Authority', 'Darts', '451 mm in diameter.'),

  // ---------- media and cases ----------
  obj('minidisc', 'MiniDisc', 'MiniDisc', 72, 68, 'width',
    rect(72, 68, 3) + cut(44, 0, 22, 44, 1) + `<circle class="ds" cx="30" cy="38" r="20" stroke-width="1.2"/>` + dot(30, 38, 5),
    'MiniDisc cartridge.', 'MiniDisc cartridge', 'MiniDisc', 'The cartridge is 68 × 72 × 5 mm. The longer side is quoted.'),
  obj('betamax', 'Betamax tape', 'Betamax tape', 156, 96, 'width',
    rect(156, 96, 3.5) + cut(40, 10, 76, 10, 2) + cut(24, 32, 108, 38, 5) + dot(52, 51, 12, 'i') + dot(104, 51, 12, 'i'),
    'Betamax video cassette.', 'Betamax cassette', 'Betamax', '15.6 × 9.6 × 2.5 cm. Width quoted. Smaller than a VHS tape.'),
  obj('compactflash', 'CompactFlash card', 'CompactFlash card', 43, 36, 'width',
    rect(43, 36, 1.6) + cut(5, 5, 33, 20, 1.2) + line('M4 31H39', 1.4),
    'CompactFlash Type I memory card.', 'CompactFlash specification', 'CompactFlash', '43 × 36 × 3.3 mm. Width quoted.'),
  obj('jewel-case', 'CD jewel case', 'CD jewel case', 142, 125, 'width',
    rect(142, 125, 2) + line('M13 0V125', 1.6) + `<circle class="ds" cx="78" cy="62.5" r="56" stroke-width="1.6"/>` + dot(78, 62.5, 8),
    'Standard CD jewel case, closed.', 'CD jewel case', 'Optical_disc_packaging', '142 × 125 × 10 mm. Width quoted.'),
  obj('dvd-case', 'DVD keep case', 'DVD case', 135, 190, 'height',
    rect(135, 190, 5) + `<rect class="ds" x="9" y="9" width="117" height="172" rx="3" stroke-width="1.6"/>` + `<circle class="ds" cx="67.5" cy="95" r="50" stroke-width="1.6"/>` + dot(67.5, 95, 8),
    'Standard DVD keep case, closed.', 'DVD keep case', 'Optical_disc_packaging', '135 × 190 × 14 mm. Height quoted.'),
  obj('laserdisc', 'LaserDisc', 'LaserDisc', D.laser, D.laser, 'diameter',
    ball(D.laser, ring(D.laser, 0.95, 2.4) + ring(D.laser, 0.36, 2.4) + dot(150, 150, 17.5)),
    'Full-size (30 cm) LaserDisc.', 'LaserDisc (30 cm)', 'LaserDisc', '300 mm in diameter.'),
  obj('ten-inch-record', '10-inch record', '10-inch record', D.ten, D.ten, 'diameter',
    ball(D.ten, ring(D.ten, 0.72, 2) + dot(127, 127, 44) + dot(127, 127, 3.6, 'i')),
    '10-inch phonograph record.', '10-inch record format', 'LP_record', 'Nominal size: 10 in (254 mm). Pressed records are typically a few millimetres under.'),

  // ---------- paper, cards, notes ----------
  obj('business-card', 'US business card', 'business card', inch(3.5), inch(2), 'width',
    rect(inch(3.5), inch(2), 1) + cut(8, 9, 11, 11, 1.5) + cut(8, 30, 46, 3, 1.5) + cut(8, 38, 30, 3, 1.5),
    'Standard United States business card.', 'US business card (3.5 × 2 in)', 'Business_card', '3.5 × 2 in, about 89 × 51 mm. Slightly wider and shorter than a payment card. Width quoted.'),
  obj('index-card', 'Index card (3 × 5 in)', 'index card', inch(5), inch(3), 'width',
    rect(inch(5), inch(3), 1) + line('M0 16H127', 1.8) + line('M0 28H127M0 39H127M0 50H127M0 61H127', 0.8),
    'Standard 3-by-5-inch index card.', '3 × 5 in index card', 'Index_card', '3 × 5 in, i.e. 76.2 × 127 mm. Long side quoted.'),
  obj('a4-sheet', 'A4 sheet of paper', 'A4 sheet', 210, 297, 'height',
    `<path d="M0 0H170L210 40V297H0Z"/>` + line('M170 0V40H210', 3) + cut(28, 70, 154, 7, 3) + cut(28, 100, 154, 7, 3) + cut(28, 130, 154, 7, 3) + cut(28, 160, 100, 7, 3),
    'ISO 216 A4 sheet, portrait.', 'ISO 216 (A4)', 'International_standard_paper_sizes', '210 × 297 mm. Height quoted.'),
  obj('photo-print', '4 × 6 in photo print', 'photo print', 152, 102, 'width',
    rect(152, 102, 1) + cut(7, 7, 138, 88, 1) + `<path class="i" d="M7 95L52 46L80 74L104 52L145 95Z"/>` + dot(118, 28, 9, 'i'),
    'Standard 4R (4 × 6 in) photographic print.', 'ISO 1008 photo print (4R)', 'Photo_print_sizes', '102 × 152 mm. Long side quoted.'),
  obj('euro-5', '€5 note', 'five-euro note', 120, 62, 'width', euroNote(120, 62),
    'Euro five-euro banknote.', 'ECB banknote sizes (€5)', 'Euro_banknotes', '120 × 62 mm, the smallest euro note. Width quoted.'),
  obj('euro-10', '€10 note', 'ten-euro note', 127, 67, 'width', euroNote(127, 67),
    'Euro ten-euro banknote.', 'ECB banknote sizes (€10)', 'Euro_banknotes', '127 × 67 mm. Width quoted.'),
  obj('sim-card', 'Mini-SIM card', 'Mini-SIM card', 25, 15, 'width',
    `<path d="M1.2 0H21L25 4V13.8A1.2 1.2 0 0 1 23.8 15H1.2A1.2 1.2 0 0 1 0 13.8V1.2A1.2 1.2 0 0 1 1.2 0Z"/>` + cut(5, 3.5, 11, 8, 1.2) + `<path d="M10.5 3.5V11.5M5 7.5H16" stroke="currentColor" stroke-width="0.7" fill="none"/>`,
    'ISO/IEC 7810 ID-000 card, the "Mini-SIM" size.', 'ISO/IEC 7810 (ID-000)', 'ISO/IEC_7810', '25 × 15 mm. Width quoted.'),

  // ---------- everyday standards ----------
  obj('us-plate', 'US licence plate', 'US licence plate', inch(12), inch(6), 'width',
    rect(inch(12), inch(6), 12) + `<rect class="ds" x="8" y="8" width="288.8" height="136.4" rx="8" stroke-width="2.4"/>` + dot(63.5, 22, 4.5) + dot(241.3, 22, 4.5) + dot(63.5, 130.4, 4.5) + dot(241.3, 130.4, 4.5) + cut(40, 54, 64, 44, 6) + cut(120, 54, 64, 44, 6) + cut(200, 54, 64, 44, 6),
    'Standard United States passenger vehicle licence plate.', 'US plate size (6 × 12 in)', 'Vehicle_license_plates_of_the_United_States', '12 × 6 in, i.e. 304.8 × 152.4 mm. Width quoted. The design drawn is invented.'),
  obj('eu-plate', 'EU number plate', 'EU number plate', 520, 110, 'width',
    rect(520, 110, 8) + cut(8, 8, 42, 94, 4) + cut(76, 30, 70, 50, 6) + cut(166, 30, 70, 50, 6) + cut(256, 30, 70, 50, 6) + cut(346, 30, 70, 50, 6) + cut(436, 30, 60, 50, 6),
    'Common European vehicle registration plate, single-line format.', 'European plate (520 × 110 mm)', 'European_vehicle_registration_plate', '520 × 110 mm is the most common format. Width quoted. The design drawn is invented.'),
  obj('uk-brick', 'UK standard brick', 'brick', 215, 65, 'width',
    rect(215, 65, 2) + dot(60, 32.5, 11) + dot(107.5, 32.5, 11) + dot(155, 32.5, 11),
    'United Kingdom standard brick, long face.', 'UK standard brick size', 'Brick', '215 × 102.5 × 65 mm. The 215 × 65 mm face is drawn. Length quoted.'),
  obj('drink-can', 'US 12 oz drink can', 'drink can', inch(2.6), inch(4.83), 'height',
    `<path d="M9 0H57L66.04 13V114L59 122.68H7L0 114V13Z"/>` + line('M4 13H62M4 114H62', 1.2) + cut(26, 3.5, 14, 5, 2.5),
    'United States standard 12 US fl oz beverage can.', 'US standard drink can', 'Drink_can', '4.83 in tall and 2.6 in across at the widest point of the body, i.e. 122.7 × 66.0 mm. Height quoted.'),
];
