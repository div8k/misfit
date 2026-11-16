import type { GameObject, Measure, VerificationStatus } from '../engine/types.ts';
import { ball, inch, make } from './make.ts';

// FIFTH BATCH: a wider mix (16 November 2026).
// Three kinds of entry, and each object's notes say which it is:
//  - CHECKED: the size was confirmed against the cited page by a script that
//    fetched the page and matched the figures (secondary sources).
//  - BY NAME: the size is part of the object's name (a 21-inch wheel, a 12-inch
//    pizza, a 55-inch screen), so it follows from arithmetic, not a source.
//  - TYPICAL: there is no official size. The figure is the author's estimate of a
//    common example and is marked status "typical"; the game says so on the reveal.
// For a few tall objects only one dimension is documented; the other follows the drawing.

const f = (x: number) => +x.toFixed(2);
const wiki = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
function o(
  id: string, label: string, noun: string, widthMm: number, heightMm: number, measure: Measure,
  art: string, definition: string, sourceShortName: string, page: string, notes: string, status: VerificationStatus = 'verified',
): GameObject {
  const g = make({ id, label, noun, widthMm, heightMm, measure, art, definition, sourceShortName, notes,
    sourceTitle: `${decodeURIComponent(page).replace(/_/g, ' ')} — Wikipedia`, sourceUrl: wiki(page) });
  return status === 'typical' ? { ...g, status: 'typical', retrieved: null } : { ...g, retrieved: '2026-11-16' };
}
const R = (w: number, h: number, rx = 0) => `<rect width="${f(w)}" height="${f(h)}" rx="${f(rx)}"/>`;
const C = (x: number, y: number, w: number, h: number, rx = 0) => `<rect class="d" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}"/>`;
const P = (x: number, y: number, r: number, cls = 'd') => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
const L = (d: string, sw: number) => `<path class="ds" d="${d}" stroke-width="${f(sw)}"/>`;
const ringAt = (d: number, k: number, sw: number) => `<circle class="ds" cx="${f(d / 2)}" cy="${f(d / 2)}" r="${f((d / 2) * k)}" stroke-width="${f(sw)}"/>`;
const coin = (d: number, motif = '') => ball(d, ringAt(d, 0.86, d * 0.03) + (motif || P(d / 2, d / 2, d * 0.16)));
const slab = (w: number, h: number, rx: number, b: number) => R(w, h, rx) + C(b, b, w - 2 * b, h - 2 * b, Math.max(1, rx - b)) + P(w / 2, b + h * 0.035, w * 0.03, 'i');
function sheet(w: number, h: number): string {
  const c = w * 0.19;
  const t = w * 0.027;
  const rows = [0.24, 0.34, 0.44, 0.54].map((k, i) => C(w * 0.13, h * k, w * (i === 3 ? 0.48 : 0.74), t, t / 2)).join('');
  return `<path d="M0 0H${f(w - c)}L${f(w)} ${f(c)}V${f(h)}H0Z"/>` + L(`M${f(w - c)} 0V${f(c)}H${f(w)}`, t * 0.45) + rows;
}
const note = (w: number, h: number) => R(w, h, 1) + P(w * 0.3, h / 2, h * 0.27) + C(w * 0.62, h * 0.14, w * 0.16, h * 0.72, h * 0.1);
const slats = (w: number, h: number, n: number) => R(w, h, 4) + Array.from({ length: n }, (_, i) => C(0, (h / (n + 1)) * (i + 1) - h * 0.02, w, h * 0.04)).join('');
const screen = (w: number, h: number) => R(w, h, w * 0.012) + C(w * 0.012, w * 0.012, w * 0.976, h - w * 0.024, w * 0.006);
const pizza = (d: number) => ball(d, ringAt(d, 0.88, d * 0.02) + [[0.35, 0.35], [0.62, 0.3], [0.5, 0.55], [0.3, 0.64], [0.68, 0.66]].map(([x, y]) => P(d * x, d * y, d * 0.055)).join(''));
/** Side view of a car from a simple outline in a 100 × 41 grid, stretched to the real length and height. */
function car(w: number, h: number, outline: number[][], glass: number[][]): string {
  const sx = w / 100;
  const sy = h / 41;
  const pts = (a: number[][]) => a.map(([x, y]) => `${f(x * sx)},${f(y * sy)}`).join(' ');
  const wheel = (x: number) => `<ellipse cx="${f(x * sx)}" cy="${f(33 * sy)}" rx="${f(8 * sx)}" ry="${f(8 * sy)}"/><ellipse class="d" cx="${f(x * sx)}" cy="${f(33 * sy)}" rx="${f(3.6 * sx)}" ry="${f(3.6 * sy)}"/>`;
  return `<polygon points="${pts(outline)}"/><polygon class="d" points="${pts(glass)}"/>` + wheel(22) + wheel(78);
}
const HATCH = [[0, 30], [2, 22], [12, 19], [26, 17], [36, 5], [64, 4], [80, 6], [90, 18], [98, 21], [100, 30], [98, 35], [0, 35]];
const HATCH_G = [[38, 8], [62, 7], [74, 9], [80, 17], [30, 17]];
const BUG = [[0, 31], [3, 24], [14, 20], [26, 10], [42, 3], [60, 3], [76, 10], [88, 22], [98, 26], [100, 33], [96, 36], [0, 36]];
const BUG_G = [[32, 10], [44, 6], [58, 6], [70, 12], [72, 19], [28, 19]];
const SUV = [[0, 30], [2, 20], [14, 15], [30, 13], [42, 3], [72, 2], [90, 10], [98, 18], [100, 30], [98, 35], [0, 35]];
const SUV_G = [[44, 6], [70, 5], [84, 11], [86, 14], [34, 14]];
const CAB = [[0, 32], [2, 20], [16, 16], [24, 3], [78, 2], [90, 14], [99, 18], [100, 32], [98, 36], [0, 36]];
const CAB_G = [[28, 6], [76, 5], [84, 14], [24, 15]];
const WEDGE = [[0, 30], [4, 20], [38, 2], [98, 16], [100, 30], [98, 35], [0, 35]];
const WEDGE_G = [[20, 16], [39, 6], [70, 13], [70, 17]];

const IN21 = inch(21);
const TYRE = f(inch(16) + 2 * 205 * 0.55);
const diag = (inches: number) => ({ w: f(inch(inches) * (16 / Math.hypot(16, 9))), h: f(inch(inches) * (9 / Math.hypot(16, 9))) });
const TV55 = diag(55), TV32 = diag(32), MON27 = diag(27), LAP15 = diag(15.6);
const BYNAME = 'BY NAME: the size is part of the name, so it follows from arithmetic.';
const TYP = 'TYPICAL: no official size exists. This is an estimate of a common example, not a standard.';

export const WIDE_OBJECTS: GameObject[] = [
  // ---------- what the owner asked for ----------
  o('car-wheel-21', '21-inch car wheel (rim)', '21-inch wheel', IN21, IN21, 'diameter',
    ball(IN21, [0, 1, 2, 3, 4].map((i) => P(IN21 / 2 + 150 * Math.cos((i * 2 * Math.PI) / 5 - Math.PI / 2), IN21 / 2 + 150 * Math.sin((i * 2 * Math.PI) / 5 - Math.PI / 2), 62)).join('') + P(IN21 / 2, IN21 / 2, 34) + P(IN21 / 2, IN21 / 2, 14, 'i')),
    'Car wheel rim with a 21-inch nominal diameter, without the tyre.', '21 in rim diameter', 'Rim_(wheel)', `${BYNAME} 21 in is 533.4 mm.`),
  o('house-key', 'House key', 'house key', 24, 57, 'height',
    '<circle cx="12" cy="12" r="12"/><rect x="8.5" y="20" width="7" height="37" rx="1.5"/>' + P(12, 9, 3.4) + C(13, 30, 2.5, 4) + C(13, 38, 2.5, 5) + C(13, 47, 2.5, 4),
    'Ordinary pin-tumbler house key.', 'typical size (estimate)', 'Key_(lock)', `${TYP} About 57 mm long.`, 'typical'),
  o('tissue-box', 'Tissue box (flat)', 'tissue box', 230, 120, 'width',
    R(230, 120, 8) + '<ellipse class="d" cx="115" cy="60" rx="62" ry="20"/>' + '<path class="i" d="M88 60Q100 30 115 52Q130 28 142 60Z"/>',
    'Standard flat box of facial tissues, seen from above.', 'typical size (estimate)', 'Facial_tissue', `${TYP} About 23 × 12 cm on top.`, 'typical'),
  o('water-bottle', 'Plastic water bottle (500 ml)', 'water bottle', 65, 205, 'height',
    '<rect x="21" y="0" width="23" height="14" rx="2"/><path d="M23 13H42V24Q65 38 65 58V197a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V58Q0 38 23 24Z"/>' + C(0, 96, 65, 46) + L('M4 70H61M4 160H61M4 176H61', 1.6),
    'Single-serve 500 ml (16.9 fl oz) plastic water bottle.', 'typical size (estimate)', 'Bottled_water', `${TYP} About 20.5 cm tall and 6.5 cm across.`, 'typical'),
  o('costco-hot-dog', 'Costco hot dog', 'Costco hot dog', 200, 62, 'width',
    R(200, 62, 30) + '<rect class="d" x="-2" y="20" width="204" height="22" rx="11"/>' + '<path d="M14 31Q26 22 38 31T62 31T86 31T110 31T134 31T158 31T186 31" fill="none" stroke="currentColor" stroke-width="3"/>',
    'Costco food-court quarter-pound hot dog in its bun.', 'typical size (estimate)', 'Costco_hot_dog', `${TYP} The published spec is its weight (a quarter pound), not its length. About 20 cm long.`, 'typical'),
  o('baguette', 'Baguette', 'baguette', 650, 55, 'width',
    R(650, 55, 27) + L('M90 12L130 43M210 12L250 43M330 12L370 43M450 12L490 43M560 12L596 43', 5),
    'Traditional French baguette.', 'usual size (approximate)', 'Baguette', 'TYPICAL: the source gives a usual length of about 65 cm and a diameter of about 5–6 cm. Loaves vary.', 'typical'),
  o('hula-hoop', 'Hula hoop (adult)', 'hula hoop', 1000, 1000, 'diameter', ball(1000, P(500, 500, 462)),
    'Adult-size hula hoop.', 'usual size (approximate)', 'Hula_hoop', 'TYPICAL: the source says adult hoops measure around 100 cm across. Hoops vary.', 'typical'),

  // ---------- sizes that are part of the name ----------
  o('car-tyre', 'Car tyre (205/55 R16)', 'car tyre', TYRE, TYRE, 'diameter', ball(TYRE, P(TYRE / 2, TYRE / 2, inch(8)) + P(TYRE / 2, TYRE / 2, 60, 'i') + ringAt(TYRE, 0.9, 6)),
    'Passenger car tyre, size 205/55 R16, fitted and inflated.', 'tyre size code 205/55 R16', 'Tire_code', `${BYNAME} 16 in rim plus two sidewalls of 55% of 205 mm: about 632 mm across.`),
  o('pizza-12', '12-inch pizza', '12-inch pizza', inch(12), inch(12), 'diameter', pizza(inch(12)),
    'Pizza sold as 12 inches across.', '12 in diameter', 'Pizza', `${BYNAME} 12 in is 304.8 mm.`),
  o('pizza-16', '16-inch pizza', '16-inch pizza', inch(16), inch(16), 'diameter', pizza(inch(16)),
    'Pizza sold as 16 inches across.', '16 in diameter', 'Pizza', `${BYNAME} 16 in is 406.4 mm.`),
  o('footlong-sub', 'Footlong sub sandwich', 'footlong sub', inch(12), 82, 'width', R(inch(12), 82, 38) + '<rect class="d" x="-2" y="34" width="309" height="14" rx="7"/>',
    'Sub sandwich sold as a foot long.', '12 in length', 'Submarine_sandwich', `${BYNAME} 12 in is 304.8 mm long. The width follows the drawing.`),
  o('ruler-12', '12-inch ruler', '12-inch ruler', inch(12), 30, 'width',
    R(inch(12), 30, 1.5) + Array.from({ length: 13 }, (_, i) => C(i * 25.4 - (i ? 0.5 : 0) - (i === 12 ? 0.5 : 0), 0, 1, i % 6 === 0 ? 15 : 9)).join(''),
    'Ordinary 12-inch (one foot) ruler.', '12 in length', 'Ruler', `${BYNAME} 12 in is 304.8 mm long. The width follows the drawing.`),
  o('tv-55', '55-inch TV screen', '55-inch TV screen', TV55.w, TV55.h, 'width', screen(TV55.w, TV55.h),
    'Screen of a 55-inch 16:9 television (the screen itself, not the stand).', '55 in diagonal, 16:9', 'Display_size', `${BYNAME} A 55 in diagonal at 16:9 is about 121.8 × 68.5 cm.`),
  o('tv-32', '32-inch TV screen', '32-inch TV screen', TV32.w, TV32.h, 'width', screen(TV32.w, TV32.h),
    'Screen of a 32-inch 16:9 television.', '32 in diagonal, 16:9', 'Display_size', `${BYNAME} A 32 in diagonal at 16:9 is about 70.8 × 39.8 cm.`),
  o('monitor-27', '27-inch monitor screen', '27-inch monitor screen', MON27.w, MON27.h, 'width', screen(MON27.w, MON27.h),
    'Screen of a 27-inch 16:9 computer monitor.', '27 in diagonal, 16:9', 'Display_size', `${BYNAME} A 27 in diagonal at 16:9 is about 59.8 × 33.6 cm.`),
  o('laptop-15', '15.6-inch laptop screen', '15.6-inch laptop screen', LAP15.w, LAP15.h, 'width', screen(LAP15.w, LAP15.h),
    'Screen of a 15.6-inch 16:9 laptop.', '15.6 in diagonal, 16:9', 'Display_size', `${BYNAME} A 15.6 in diagonal at 16:9 is about 34.5 × 19.4 cm.`),
  o('floppy-525', '5¼-inch floppy disk', '5¼-inch floppy disk', inch(5.25), inch(5.25), 'width',
    R(inch(5.25), inch(5.25), 2) + P(66.7, 66.7, 14) + C(60, 92, 13, 34, 6),
    '5¼-inch floppy disk in its jacket.', '5¼ in format', 'Floppy_disk', `${BYNAME} 5¼ in is about 133 mm square.`),
  o('container-20', '20-foot shipping container', 'shipping container', inch(240), inch(102), 'width',
    R(inch(240), inch(102), 20) + L(Array.from({ length: 22 }, (_, i) => `M${f(260 + i * 250)} 120V2470`).join(''), 26),
    'Standard 20-foot intermodal shipping container, side view.', '20 ft × 8 ft 6 in', 'Intermodal_container', `${BYNAME} 20 ft long by the standard 8 ft 6 in tall (the page confirms the height). The exact ISO length is slightly under 20 ft.`),

  // ---------- phones that are not Apple ----------
  o('galaxy-s24', 'Samsung Galaxy S24', 'Galaxy S24', 70.6, 147, 'height', slab(70.6, 147, 9, 2.6),
    'Samsung Galaxy S24 (standard model).', 'Galaxy S24 dimensions', 'Samsung_Galaxy_S24', 'CHECKED: 147 × 70.6 mm. Height quoted.'),
  o('galaxy-s24-ultra', 'Samsung Galaxy S24 Ultra', 'Galaxy S24 Ultra', 79, 162.3, 'height', slab(79, 162.3, 3, 2.6),
    'Samsung Galaxy S24 Ultra.', 'Galaxy S24 Ultra dimensions', 'Samsung_Galaxy_S24', 'CHECKED: 162.3 × 79 mm. Height quoted.'),
  o('pixel-8', 'Google Pixel 8', 'Pixel 8', 70.8, 150.5, 'height', slab(70.8, 150.5, 11, 2.8),
    'Google Pixel 8.', 'Pixel 8 dimensions', 'Pixel_8', 'CHECKED: 150.5 × 70.8 mm. Height quoted.'),

  // ---------- cars, side view ----------
  o('mini-classic', 'Classic Mini', 'classic Mini', 3054, 1346, 'width', car(3054, 1346, HATCH, HATCH_G),
    'Original Mini saloon (1959–2000), side view.', 'Mini dimensions', 'Mini', 'CHECKED: 3,054 mm long and 1,346 mm tall. Length quoted. The outline is simplified.'),
  o('fiat-500', 'Fiat 500 (1957)', 'classic Fiat 500', 2970, 1320, 'width', car(2970, 1320, BUG, BUG_G),
    'Original Fiat 500 (1957–1975), side view.', 'Fiat 500 dimensions', 'Fiat_500', 'CHECKED: 2,970 mm long and 1,320 mm tall. Length quoted. The outline is simplified.'),
  o('vw-beetle', 'Volkswagen Beetle (classic)', 'VW Beetle', 4079, 1500, 'width', car(4079, 1500, BUG, BUG_G),
    'Classic Volkswagen Beetle (Type 1), side view.', 'Beetle dimensions', 'Volkswagen_Beetle', 'CHECKED: 4,079 mm long (later models up to 4,140) and 1,500 mm tall. Length quoted. The outline is simplified.'),
  o('vw-golf', 'Volkswagen Golf (Mk8)', 'VW Golf', 4284, 1456, 'width', car(4284, 1456, HATCH, HATCH_G),
    'Volkswagen Golf Mk8 hatchback, side view.', 'Golf Mk8 dimensions', 'Volkswagen_Golf_Mk8', 'CHECKED: 4,284 mm long and 1,456 mm tall. Length quoted. The outline is simplified.'),
  o('tesla-model-y', 'Tesla Model Y', 'Tesla Model Y', 4751, 1624, 'width', car(4751, 1624, SUV, SUV_G),
    'Tesla Model Y (2020–2025), side view.', 'Model Y dimensions', 'Tesla_Model_Y', 'CHECKED: 4,751 mm long and 1,624 mm tall. Length quoted. The outline is simplified.'),
  o('london-taxi', 'London black cab (LEVC TX)', 'London taxi', 4857, 1888, 'width', car(4857, 1888, CAB, CAB_G),
    'LEVC TX London taxi, side view.', 'LEVC TX dimensions', 'LEVC_TX', 'CHECKED: 4,857 mm long and 1,888 mm tall. Length quoted. The outline is simplified.'),
  o('cybertruck', 'Tesla Cybertruck', 'Cybertruck', inch(223.74), inch(70.7), 'width', car(inch(223.74), inch(70.7), WEDGE, WEDGE_G),
    'Tesla Cybertruck, side view.', 'Cybertruck dimensions', 'Tesla_Cybertruck', 'CHECKED: 223.74 in long and 70.7 in tall, i.e. about 5.68 × 1.80 m. Length quoted. The outline is simplified.'),

  // ---------- sport and games ----------
  o('hockey-goal', 'Ice hockey goal', 'hockey goal', inch(72), inch(48), 'width',
    R(inch(72), inch(48), 30) + C(60, 60, inch(72) - 120, inch(48) - 60) + L('M60 360H1769M60 660H1769M60 960H1769M360 60V1219M660 60V1219M960 60V1219M1260 60V1219M1560 60V1219', 8),
    'Ice hockey goal opening, front view.', 'Hockey goal opening', 'Goal_(ice_hockey)', 'CHECKED: the opening is 72 in wide and 48 in tall, about 183 × 122 cm. Width quoted.'),
  o('backboard', 'Basketball backboard', 'basketball backboard', inch(72), inch(42), 'width',
    R(inch(72), inch(42), 20) + `<rect class="ds" x="${f(inch(24))}" y="${f(inch(22))}" width="${f(inch(24))}" height="${f(inch(18))}" stroke-width="50"/>` + `<rect class="ds" x="40" y="40" width="${f(inch(72) - 80)}" height="${f(inch(42) - 80)}" stroke-width="30"/>`,
    'Regulation basketball backboard.', 'Backboard size', 'Backboard_(basketball)', 'CHECKED: 6 ft wide and 3.5 ft tall, about 183 × 107 cm. Width quoted.'),
  o('tt-table', 'Table tennis table', 'table tennis table', 2740, 1525, 'width', R(2740, 1525, 10) + L('M0 762.5H2740', 14) + L('M1370 0V1525', 34),
    'Table tennis table top, seen from above.', 'ITTF table size', 'Table_tennis', 'CHECKED: 2.74 m long and 1.525 m wide. Length quoted.'),
  o('snooker-table', 'Snooker table (12 ft)', 'snooker table', inch(144), inch(72), 'width',
    R(inch(144), inch(72), 60) + C(130, 130, inch(144) - 260, inch(72) - 260, 30) + [[90, 90], [1829, 70], [3568, 90], [90, 1739], [1829, 1759], [3568, 1739]].map(([x, y]) => P(x, y, 62, 'i')).join(''),
    'Full-size snooker table, seen from above.', 'Snooker table (12 × 6 ft)', 'Billiard_table', 'CHECKED: commonly referred to as 12 ft by 6 ft, about 3.66 × 1.83 m. Length quoted.'),
  o('cricket-wicket', 'Cricket wicket', 'cricket wicket', inch(9), inch(28), 'height',
    [0, 95.3, 190.6].map((x) => `<rect x="${x}" y="14" width="38" height="697.2" rx="6"/>`).join('') + '<rect x="0" y="0" width="228.6" height="18" rx="8"/>',
    'Cricket wicket: three stumps and two bails.', 'Laws of Cricket (wicket)', 'Wicket', 'CHECKED: stumps 28 in tall, set 9 in wide in total, about 71 × 23 cm. Height quoted.'),
  o('archery-target', 'Archery target (122 cm)', 'archery target', 1220, 1220, 'diameter',
    ball(1220, ringAt(1220, 0.8, 16) + ringAt(1220, 0.6, 16) + ringAt(1220, 0.4, 16) + P(610, 610, 122)),
    'Outdoor archery target face used at 70 m.', 'World Archery target face', 'Target_archery', 'CHECKED: 122 cm in diameter.'),
  o('beach-volleyball', 'Beach volleyball', 'beach volleyball', 213, 213, 'diameter',
    ball(213, L('M106.5 0C60 60 60 153 106.5 213M106.5 0C153 60 153 153 106.5 213M4 80C70 110 143 110 209 80', 3.6)),
    'Beach volleyball match ball.', 'FIVB beach ball specification', 'Beach_volleyball', 'CHECKED, A RANGE: circumference 66–68 cm, about 210–216 mm across. 213 mm is used. Slightly bigger than an indoor ball.'),
  o('ukulele', 'Ukulele (soprano)', 'ukulele', 170, inch(21), 'height',
    '<circle cx="85" cy="430" r="85"/><circle cx="85" cy="330" r="64"/><rect x="68" y="60" width="34" height="230"/><rect x="58" y="0" width="54" height="72" rx="8"/>' + P(85, 395, 26) + C(60, 455, 50, 9),
    'Soprano (standard) ukulele.', 'Soprano ukulele length', 'Ukulele', 'CHECKED: 21 in (about 53 cm) long. Only the length is documented; the width follows this simplified drawing.'),

  // ---------- trophies and medals ----------
  o('oscar', 'Oscar statuette', 'Oscar statuette', 86, inch(13.5), 'height',
    '<circle cx="43" cy="20" r="18"/><path d="M26 40H60L66 120L56 250H30L20 120Z"/><rect x="8" y="246" width="70" height="96.9" rx="6"/>' + C(8, 270, 70, 6) + C(8, 300, 70, 6),
    'Academy Award of Merit statuette.', 'Oscar statuette height', 'Academy_Awards', 'CHECKED: 13.5 in (34.3 cm) tall. Only the height is documented; the width follows this simplified drawing.'),
  o('fa-cup', 'FA Cup trophy', 'FA Cup', 300, 615, 'height',
    '<path d="M70 150H230L212 330Q150 400 88 330Z"/><rect x="132" y="370" width="36" height="110"/><rect x="60" y="470" width="180" height="145" rx="10"/><path d="M110 150Q150 40 190 150Z"/><circle cx="150" cy="60" r="20"/>' + L('M70 180Q0 200 60 290M230 180Q300 200 240 290', 16) + C(60, 520, 180, 10),
    'FA Cup trophy (the design used since 1911).', 'FA Cup trophy height', 'FA_Cup', 'CHECKED: 61.5 cm high. Only the height is documented; the width follows this simplified drawing.'),
  o('nobel-medal', 'Nobel Prize medal', 'Nobel medal', 66, 66, 'diameter', coin(66, '<path class="d" d="M24 46Q20 22 36 16Q48 20 44 34L48 40L42 42L42 50Z"/>'),
    'Nobel Prize medal.', 'Nobel medal diameter', 'Nobel_Prize', 'CHECKED: 66 mm in diameter.'),

  // ---------- home, paper, travel ----------
  o('lumber-2x4', '2×4 timber (end)', '2×4', inch(3.5), inch(1.5), 'width', R(inch(3.5), inch(1.5), 3) + L('M10 30Q44 4 78 30M22 34Q44 16 66 34', 1.4),
    'End of a US "2×4" plank after milling.', 'Dressed 2×4 size', 'Lumber', 'CHECKED: a 2×4 is really 1½ × 3½ in, about 38 × 89 mm. Width quoted.'),
  o('plywood-sheet', 'Plywood sheet (4 × 8 ft)', 'plywood sheet', inch(48), inch(96), 'height', R(inch(48), inch(96), 6) + L('M200 200Q600 700 300 1300T700 2300M800 150Q1000 900 850 1500', 12),
    'Standard 4 × 8 ft sheet of plywood.', 'Plywood sheet (4 × 8 ft)', 'Plywood', 'CHECKED: 4 × 8 ft, about 1.22 × 2.44 m. Height quoted.'),
  o('us-brick', 'US standard brick', 'brick', 194, 57, 'width', R(194, 57, 2) + P(52, 28.5, 10) + P(97, 28.5, 10) + P(142, 28.5, 10),
    'United States standard brick, long face.', 'US brick size', 'Brick', 'CHECKED: 194 × 92 × 57 mm. The 194 × 57 mm face is drawn. Length quoted.'),
  o('eur-pallet', 'Euro pallet', 'Euro pallet', 1200, 800, 'width', slats(1200, 800, 4),
    'EUR/EPAL pallet, seen from above.', 'EUR-pallet size', 'EUR-pallet', 'CHECKED: 800 × 1,200 mm. Length quoted.'),
  o('carry-on', 'Carry-on suitcase', 'carry-on suitcase', 450, 560, 'height',
    '<rect x="150" y="0" width="150" height="50" rx="14"/><rect x="0" y="40" width="450" height="490" rx="34"/><circle cx="80" cy="540" r="20"/><circle cx="370" cy="540" r="20"/>' + C(150, 12, 150, 14, 7) + L('M90 120V450M225 120V450M360 120V450', 10),
    'Cabin bag at the IATA recommended maximum size.', 'IATA cabin bag guideline', 'Hand_luggage', 'CHECKED: IATA recommends a maximum of 56 × 45 × 25 cm including handle and wheels. Height quoted.'),
  o('toilet-paper-sheet', 'Toilet paper sheet (US)', 'toilet paper sheet', inch(4.5), inch(4), 'width', R(inch(4.5), inch(4), 0) + `<path class="ds" d="M0 2H114.3M0 99.6H114.3" stroke-width="1.2" stroke-dasharray="3 3"/>`,
    'One sheet of US toilet paper.', 'US toilet paper sheet size', 'Toilet_paper', 'CHECKED: the manufactured US sheet was sized 4.5 × 4 in, about 114 × 102 mm. Many brands are now slightly smaller. Width quoted.'),
  o('paperback', 'Paperback book (A-format)', 'paperback book', 110, 178, 'height', R(110, 178, 2) + L('M8 0V178', 1.4) + C(24, 30, 68, 12, 2) + C(24, 52, 44, 7, 2) + C(24, 140, 50, 6, 2),
    'Mass-market (A-format) paperback.', 'A-format paperback', 'Paperback', 'CHECKED: 110 × 178 mm. Height quoted.'),
  o('legal-sheet', 'US Legal sheet', 'US Legal sheet', inch(8.5), inch(14), 'height', sheet(inch(8.5), inch(14)),
    'US Legal paper, portrait.', 'US Legal (8½ × 14 in)', 'Paper_size', 'CHECKED: 8½ × 14 in, about 216 × 356 mm. Height quoted.'),
  o('a2-sheet', 'A2 sheet of paper', 'A2 sheet', 420, 594, 'height', sheet(420, 594), 'ISO 216 A2 sheet, portrait.', 'ISO 216 (A2)', 'International_standard_paper_sizes', 'CHECKED: 420 × 594 mm. Height quoted.'),
  o('a1-sheet', 'A1 sheet of paper', 'A1 sheet', 594, 841, 'height', sheet(594, 841), 'ISO 216 A1 sheet, portrait.', 'ISO 216 (A1)', 'International_standard_paper_sizes', 'CHECKED: 594 × 841 mm. Height quoted.'),
  o('a0-sheet', 'A0 sheet of paper', 'A0 sheet', 841, 1189, 'height', sheet(841, 1189), 'ISO 216 A0 sheet, portrait: one square metre.', 'ISO 216 (A0)', 'International_standard_paper_sizes', 'CHECKED: 841 × 1,189 mm. Height quoted.'),
  o('b5-sheet', 'B5 sheet of paper', 'B5 sheet', 176, 250, 'height', sheet(176, 250), 'ISO 216 B5 sheet, portrait.', 'ISO 216 (B5)', 'International_standard_paper_sizes', 'CHECKED: 176 × 250 mm. Height quoted.'),
  o('photo-5x7', '5 × 7 in photo print', '5 × 7 photo print', 178, 127, 'width',
    R(178, 127, 1) + C(8, 8, 162, 111, 1) + '<path class="i" d="M8 119L60 56L94 92L122 64L170 119Z"/>' + P(138, 34, 11, 'i'),
    '5R (5 × 7 in) photographic print.', 'Photo print 5R', 'Photo_print_sizes', 'CHECKED: 127 × 178 mm. Long side quoted.'),

  // ---------- money from around the world ----------
  o('gbp-5', 'UK £5 note', 'five-pound note', 125, 65, 'width', note(125, 65), 'Bank of England polymer £5 note.', 'Bank of England £5 note', 'Bank_of_England_%C2%A35_note', 'CHECKED: 125 × 65 mm. Width quoted.'),
  o('gbp-10', 'UK £10 note', 'ten-pound note', 132, 69, 'width', note(132, 69), 'Bank of England polymer £10 note.', 'Bank of England £10 note', 'Bank_of_England_%C2%A310_note', 'CHECKED: 132 × 69 mm. Width quoted.'),
  o('gbp-20', 'UK £20 note', 'twenty-pound note', 139, 73, 'width', note(139, 73), 'Bank of England polymer £20 note.', 'Bank of England £20 note', 'Bank_of_England_%C2%A320_note', 'CHECKED: 139 × 73 mm. Width quoted.'),
  o('yen-1000', 'Japanese ¥1,000 note', 'thousand-yen note', 150, 76, 'width', note(150, 76), 'Japanese 1,000 yen banknote.', '1,000 yen note', '1000_yen_note', 'CHECKED: 150 × 76 mm. Width quoted.'),
  o('yen-1', 'Japanese ¥1 coin', 'one-yen coin', 20, 20, 'diameter', coin(20), 'Japanese 1 yen coin (aluminium).', '1 yen coin', '1_yen_coin', 'CHECKED: 20 mm in diameter.'),
  o('yen-100', 'Japanese ¥100 coin', 'hundred-yen coin', 22.6, 22.6, 'diameter', coin(22.6), 'Japanese 100 yen coin.', '100 yen coin', '100_yen_coin', 'CHECKED: 22.6 mm in diameter.'),
  o('yen-500', 'Japanese ¥500 coin', 'five-hundred-yen coin', 26.5, 26.5, 'diameter', coin(26.5), 'Japanese 500 yen coin.', '500 yen coin', '500_yen_coin', 'CHECKED: 26.5 mm in diameter.'),
  o('euro-1c', 'Euro 1 cent coin', 'one-cent euro coin', 16.25, 16.25, 'diameter', coin(16.25), 'Euro 1 cent coin.', '1 euro cent coin', '1_euro_cent_coin', 'CHECKED: 16.25 mm in diameter.'),
  o('euro-20c', 'Euro 20 cent coin', 'twenty-cent euro coin', 22.25, 22.25, 'diameter', coin(22.25), 'Euro 20 cent coin.', '20 euro cent coin', '20_euro_cent_coin', 'CHECKED: 22.25 mm in diameter.'),
  o('euro-50c', 'Euro 50 cent coin', 'fifty-cent euro coin', 24.25, 24.25, 'diameter', coin(24.25), 'Euro 50 cent coin.', '50 euro cent coin', '50_euro_cent_coin', 'CHECKED: 24.25 mm in diameter.'),
  o('uk-2p', 'UK 2p coin', 'two-pence coin', 25.9, 25.9, 'diameter', coin(25.9), 'United Kingdom two pence coin.', 'UK 2p coin', 'Two_pence_(British_decimal_coin)', 'CHECKED: 25.9 mm in diameter.'),
  o('uk-10p', 'UK 10p coin', 'ten-pence coin', 24.5, 24.5, 'diameter', coin(24.5), 'United Kingdom ten pence coin (1992 onward).', 'UK 10p coin', 'Ten_pence_(British_coin)', 'CHECKED: 24.5 mm in diameter.'),
];
