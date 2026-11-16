import type { GameObject, Measure } from '../engine/types.ts';
import { inch, make } from './make.ts';

// EVERYDAY OBJECTS
// ----------------
// Added 16 November 2026 at the owner's request for more familiar things.
// Product names identify the exact model whose published size is used; no logos
// are drawn. Sizes were read from the cited pages that day (secondary sources).
// Looked for but NOT added, because the page gave no clear single size:
// pencil, ballpoint pen, Lego brick, Rubik's Cube, dice, light bulb, wine bottle.

const o = (
  id: string, label: string, noun: string, widthMm: number, heightMm: number, measure: Measure,
  art: string, definition: string, sourceShortName: string, page: string, notes: string,
): GameObject =>
  ({ ...make({ id, label, noun, widthMm, heightMm, measure, art, definition, sourceShortName, notes,
    sourceTitle: `${page.replace(/_/g, ' ')} — Wikipedia`, sourceUrl: `https://en.wikipedia.org/wiki/${page}` }), retrieved: '2026-11-16' });

const S = inch(30);
const A = +(S * 0.2929).toFixed(1);
const B = +(S - A).toFixed(1);

export const EVERYDAY_OBJECTS: GameObject[] = [
  o('iphone-15', 'iPhone 15', 'iPhone 15', 71.6, 147.6, 'height',
    '<rect width="71.6" height="147.6" rx="11"/><rect class="d" x="3.2" y="3.2" width="65.2" height="141.2" rx="8.5"/><rect class="i" x="26" y="7.5" width="19.6" height="5.6" rx="2.8"/>',
    'Apple iPhone 15 (standard model, not Plus or Pro).', 'iPhone 15 dimensions', 'IPhone_15', '147.6 mm tall and 71.6 mm wide. Height quoted.'),
  o('ipad-10', 'iPad (10th generation)', 'iPad', 179.5, 248.6, 'height',
    '<rect width="179.5" height="248.6" rx="13"/><rect class="d" x="9.5" y="9.5" width="160.5" height="229.6" rx="4"/>',
    'Apple iPad, 10th generation (10.9-inch).', 'iPad (10th generation) dimensions', 'IPad_(10th_generation)', '248.6 mm tall and 179.5 mm wide. Height quoted.'),
  o('game-boy', 'Game Boy (original)', 'Game Boy', 90, 148, 'height',
    '<path d="M4 0H86a4 4 0 0 1 4 4V132a16 16 0 0 1-16 16H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Z"/><rect class="d" x="13" y="14" width="64" height="52" rx="3"/><rect class="d" x="13" y="92" width="24" height="8" rx="1.5"/><rect class="d" x="21" y="84" width="8" height="24" rx="1.5"/><circle class="d" cx="60" cy="100" r="6"/><circle class="d" cx="76" cy="92" r="6"/>',
    'Nintendo Game Boy, original 1989 model.', 'Game Boy dimensions', 'Game_Boy', '90 × 148 × 32 mm. Height quoted.'),
  o('switch-2', 'Nintendo Switch 2', 'Nintendo Switch 2', 272, 116, 'width',
    '<rect width="272" height="116" rx="15"/><rect class="d" x="50" y="8" width="172" height="100" rx="4"/><circle class="d" cx="25" cy="38" r="10"/><circle class="d" cx="247" cy="70" r="10"/><circle class="d" cx="25" cy="76" r="5"/><circle class="d" cx="247" cy="34" r="5"/>',
    'Nintendo Switch 2 with both controllers attached.', 'Nintendo Switch 2 dimensions', 'Nintendo_Switch_2', '272 × 116 mm with the Joy-Con 2 controllers attached. Width quoted.'),
  o('xbox-controller', 'Xbox Wireless Controller', 'Xbox controller', inch(6.02), inch(4.01), 'width',
    '<path d="M34 6H119a24 24 0 0 1 22 15L152.9 82a15 15 0 0 1-29 9L110 64H43L29 91a15 15 0 0 1-29-9L12 21A24 24 0 0 1 34 6Z"/><circle class="d" cx="44" cy="30" r="9"/><circle class="d" cx="95" cy="48" r="9"/><circle class="d" cx="60" cy="50" r="6"/><circle class="d" cx="112" cy="22" r="4"/><circle class="d" cx="122" cy="31" r="4"/><circle class="d" cx="102" cy="31" r="4"/><circle class="d" cx="112" cy="40" r="4"/>',
    'Microsoft Xbox Wireless Controller (Xbox One / Series generation).', 'Xbox Wireless Controller dimensions', 'Xbox_Wireless_Controller', '6.02 × 4.01 in, i.e. about 153 × 102 mm. Width quoted. The outline is simplified.'),
  o('magic-mouse', 'Apple Magic Mouse', 'Magic Mouse', 57.1, 113.5, 'height',
    '<rect width="57.1" height="113.5" rx="27"/><path class="ds" d="M28.55 10V30" stroke-width="1.6"/>',
    'Apple Magic Mouse.', 'Magic Mouse dimensions', 'Magic_Mouse', '11.35 cm long and 5.71 cm wide. Length quoted.'),
  o('crayon', 'Crayola crayon', 'crayon', inch(5 / 16), inch(3.625), 'height',
    '<path d="M3.97 0L6.4 9.5H7.94V92.08H0V9.5H1.54Z"/><rect class="d" x="0" y="24" width="7.94" height="52"/>',
    'Standard-size Crayola crayon.', 'Crayola standard crayon size', 'Crayola', '3⅝ in long and 5/16 in across, i.e. about 92 × 8 mm. Length quoted.'),
  o('jenga-block', 'Jenga block', 'Jenga block', 75, 25, 'width',
    '<rect width="75" height="25" rx="1.5"/><path class="ds" d="M6 8H60M14 17H69" stroke-width="1"/>',
    'One Jenga block, widest face.', 'Jenga block dimensions', 'Jenga', '1.5 × 2.5 × 7.5 cm. The 7.5 × 2.5 cm face is drawn. Length quoted.'),
  o('post-it', 'Post-it note', 'Post-it note', inch(3), inch(3), 'width',
    '<path d="M0 0H76.2V60L60 76.2H0Z"/><path class="ds" d="M76.2 60H60V76.2" stroke-width="1.2"/><path class="ds" d="M12 20H62M12 32H62M12 44H46" stroke-width="2"/>',
    'Typical square Post-it note.', 'Post-it note (3 × 3 in)', 'Post-it_note', 'The typical note is 3 × 3 in, i.e. 76.2 mm square.'),
  o('stop-sign', 'US stop sign', 'stop sign', S, S, 'width',
    `<polygon points="${A},0 ${B},0 ${S},${A} ${S},${B} ${B},${S} ${A},${S} 0,${B} 0,${A}"/><polygon class="ds" stroke-width="14" points="${A + 14},34 ${B - 14},34 ${S - 34},${A + 14} ${S - 34},${B - 14} ${B - 14},${S - 34} ${A + 14},${S - 34} 34,${B - 14} 34,${A + 14}"/><rect class="d" x="150" y="306" width="462" height="150" rx="14"/>`,
    'Standard United States stop sign.', 'US stop sign size (MUTCD)', 'Stop_sign', '30 in (762 mm) across opposite flat sides. The lettering is shown as a plain band.'),
];
