import { expect, test, type Page } from '@playwright/test';

// Edition #1: the hand-edited manifest. Round 1 is "Desk drawer"; its misfit is the SD card.
const DAY1 = new Date('2026-11-15T12:00:00Z');
const ROUND1 = { misfit: 'SD memory card', other: 'AA battery' };
const OBJECT_WORDS = ['card', 'battery', 'floppy', 'cassette', 'VHS', 'disc', 'ball', 'bill', 'passport', 'pin', 'LP', ' mm', ' cm'];

// "?g=demo" selects the five hand-made scenes; without it every player gets a random game.
// "playtest" shows the private playtest tools in production builds too.
const DEMO = '/?g=demo&playtest';

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push(m.text());
  });
});
test.afterEach(() => {
  expect(pageErrors, 'no uncaught errors, console errors or CSP violations').toEqual([]);
});

async function open(page: Page, at = DAY1, path = DEMO) {
  await page.clock.setFixedTime(at);
  await page.goto(path);
}

const cell = (page: Page, label: string) => page.getByRole('button', { name: label, exact: true });

async function noOverflow(page: Page) {
  const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(scroll, 'no horizontal page overflow').toBeLessThanOrEqual(client);
}

/** Plays whatever round is on screen using the mouse: first object, a few clicks of "smaller". */
async function playRoundWithMouse(page: Page) {
  await page.locator('button.cell').first().click();
  await page.getByRole('button', { name: "That's the misfit" }).click();
  await page.getByRole('button', { name: 'Make it smaller' }).click({ clickCount: 3 });
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await page.getByRole('button', { name: /Next round|See my score/ }).click();
}

async function finishDaily(page: Page) {
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  for (let i = 0; i < 5; i++) await playRoundWithMouse(page);
  await expect(page.getByRole('heading', { name: 'Your eye for size' })).toBeVisible();
}

test('intro shows the exact copy and both calls to action', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { name: "Something doesn't add up." })).toBeVisible();
  await expect(page.getByText('Four objects. One wrong size. Find it. Fix it.')).toBeVisible();
  await expect(page.getByText('5 rounds · About 2 minutes · A new exhibit every day')).toBeVisible();
  await expect(page.getByText('Free to play. No account needed.')).toBeVisible();
  await expect(page.getByText('Demo measurements — not ready for a public challenge')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try a practice round' })).toBeVisible();
});

test('mouse: a wrong pick still leads to repairing the real misfit, and double clicks score once', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  await expect(page.getByRole('heading', { name: 'Which one is the wrong size?' })).toBeVisible();
  const cta = page.locator('.controls .btn-primary');
  await expect(cta).toHaveText('Pick an object');
  await expect(cta).toBeDisabled();

  // selection can change freely before confirming
  await cell(page, ROUND1.misfit).click();
  await cell(page, ROUND1.other).click();
  await expect(cell(page, ROUND1.other)).toHaveAttribute('aria-pressed', 'true');
  await expect(cell(page, ROUND1.misfit)).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: "That's the misfit" }).dblclick();

  await expect(page.getByText('Sneaky. It was the SD card. Now fix it.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resize the SD card until it belongs.' })).toBeVisible();
  await expect(page.locator('.cell.is-wrong .badge')).toContainText('Your pick');
  await expect(page.locator('button.cell')).toHaveCount(0); // identification can no longer be changed

  const slider = page.getByRole('slider');
  await expect(slider).toHaveValue('0'); // starts at multiplier 1, not at the answer
  await slider.fill('-75'); // exp(-75 × step) ≈ 0.69 → right size for a 1.45× misfit
  await page.getByRole('button', { name: 'Lock it in' }).dblclick();

  await expect(page.getByText('Right on scale')).toBeVisible();
  await expect(page.getByText('Round 1 of 5')).toBeVisible(); // the double click did not skip ahead
  await expect(page.getByText('Missed +0')).toBeVisible();
  await expect(page.getByText('Repair +60')).toBeVisible();
  await expect(page.locator('.round-score strong')).toHaveText('60');
  await expect(page.getByText(/Shown size: 46\.4 mm\. Reference: SD Association specification\./)).toBeVisible();
  await expect(page.locator('details.why')).toContainText('only 32 mm tall');
  await expect(page.locator('.ghost')).toHaveCount(1); // dashed outline of the player's estimate
});

test('keyboard only: a full five-round game', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: "Play today's Misfit" }).focus();
  await page.keyboard.press('Enter');
  for (let round = 1; round <= 5; round++) {
    await expect(page.getByText(`Round ${round} of 5`)).toBeVisible();
    await page.locator('button.cell').nth(1).focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: "That's the misfit" }).focus();
    await page.keyboard.press('Enter');
    // focus lands on the slider; arrows nudge, Shift+arrow jumps
    await expect(page.getByRole('slider')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('slider')).toHaveValue('-2');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(page.getByRole('slider')).toHaveValue('8');
    await page.keyboard.press('Tab'); // plus button
    await page.keyboard.press('Tab'); // Lock it in
    await expect(page.getByRole('button', { name: 'Lock it in' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Next round|See my score/ })).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Your eye for size' })).toBeVisible();
  await expect(page.getByText(/^\d\/5 spotted · \d{1,3}\/500 points$/)).toBeVisible();
});

test('touch: a practice round can be completed by tapping @touch', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Try a practice round' }).tap();
  await expect(page.getByText("Practice — doesn't affect your daily score")).toBeVisible();
  await cell(page, 'AA battery').tap();
  await page.getByRole('button', { name: "That's the misfit" }).tap();
  await expect(page.getByText('Found it. Now fix it.')).toBeVisible();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Make it larger' }).tap();
  await expect(page.getByRole('slider')).toHaveValue('8');
  await page.getByRole('button', { name: 'Lock it in' }).tap();
  await expect(page.locator('.reveal-card')).toBeVisible();
  await noOverflow(page);
  // An instant second tap in the same spot counts as a double tap and is deliberately ignored.
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Back to start', exact: true }).tap();
  await expect(page.getByRole('button', { name: "Play today's Misfit" })).toBeVisible(); // practice did not touch the daily
});

test('reload resumes the exact state, and an active run keeps its date past midnight', async ({ page }) => {
  await open(page, new Date('2026-11-15T23:50:00Z'));
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  await playRoundWithMouse(page);
  await page.locator('button.cell').nth(2).click();
  await page.getByRole('button', { name: "That's the misfit" }).click();
  await page.getByRole('slider').fill('-40');
  const instruction = await page.locator('.instruction').textContent();

  await open(page, new Date('2026-11-16T00:20:00Z')); // reload after UTC midnight
  await expect(page.locator('.instruction')).toHaveText(instruction!);
  await expect(page.getByRole('slider')).toHaveValue('-40');
  await expect(page.getByText('Round 2 of 5')).toBeVisible();
  await expect(page.getByText('#1 · 15 Nov 2026')).toBeVisible();

  // going home offers the new day's exhibit as a fresh run
  await page.getByRole('button', { name: 'Misfit — back to start' }).click();
  await expect(page.getByRole('button', { name: "Play today's Misfit" })).toBeVisible();
});

test('results, spoiler-free copy, replay warning, and no overwrite on replay', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await finishDaily(page);
  const score = await page.locator('.subheading').textContent();
  await expect(page.getByText('Tomorrow: five more things that look almost right.')).toBeVisible();
  await expect(page.getByText(/1 day/)).toBeVisible();

  // No Web Share on desktop Chromium → falls back to the clipboard.
  await page.getByRole('button', { name: 'Copy score' }).click();
  await expect(page.getByText('Copied. Your group chat awaits.')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.split('\n')[0]).toBe('MISFIT #1');
  expect(copied).toContain('Four objects. One wrong size.');
  expect(copied).toContain('?d=2026-11-15&g=demo');
  for (const w of OBJECT_WORDS) expect(copied).not.toContain(w);

  await page.getByRole('button', { name: 'Challenge a friend' }).click();
  const challenge = await page.evaluate(() => navigator.clipboard.readText());
  expect(challenge).toMatch(/\?d=2026-11-15&g=demo#s=\d+$/);

  await page.getByRole('button', { name: 'Replay the reveals' }).click();
  await expect(page.getByText("Contains today's answers")).toBeVisible();
  await expect(page.locator('.replay-round')).toHaveCount(5);
  await page.getByRole('button', { name: 'Back to my score' }).click();
  await expect(page.locator('.subheading')).toHaveText(score!);
  const events = await page.evaluate(() => (window.__misfit!.events() as { name: string }[]).map((e) => e.name));
  expect(events).toContain('replay_reveal');
  expect(events).toContain('clipboard_success');

  // reload keeps the result; the intro now offers the score, not a second attempt
  await page.reload();
  await expect(page.locator('.subheading')).toHaveText(score!);
  await page.getByRole('button', { name: 'Back to start', exact: true }).click();
  await page.getByRole('button', { name: "See today's score" }).click();
  await expect(page.locator('.subheading')).toHaveText(score!);

});

test('score card is a 1080×1350 PNG', async ({ page }) => {
  await open(page);
  await finishDaily(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save score card' }).click()]);
  expect(download.suggestedFilename()).toBe('misfit-1.png');
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  const png = readFileSync(path);
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1350);
});

test('share failure paths: cancelled sheet is not a success; blocked clipboard shows a text box', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('blocked')) },
    });
  });
  await open(page);
  await finishDaily(page);

  await page.getByRole('button', { name: 'Challenge a friend' }).click();
  await expect(page.getByText('Copied. Your group chat awaits.')).toHaveCount(0);
  await expect(page.locator('.fallback')).toHaveCount(0);

  await page.getByRole('button', { name: 'Copy score' }).click();
  await expect(page.getByText("Sharing isn't available here. Copy your score instead.")).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your score, ready to copy' })).toHaveValue(/MISFIT #1/);

  const events = await page.evaluate(() => window.__misfit!.events() as { name: string; props?: { outcome?: string } }[]);
  expect(events.filter((e) => e.name === 'share_intent')).toHaveLength(2);
  expect(events.find((e) => e.name === 'share_sheet_resolved')?.props?.outcome).toBe('cancelled');
  expect(events.some((e) => e.name === 'clipboard_success')).toBe(false);
});

test('friend link opens the same date, labels the claim unverified, and rejects junk', async ({ page }) => {
  await open(page, new Date('2026-11-18T09:00:00Z'), '/?d=2026-11-15&g=demo#s=412');
  await expect(page.getByText('They claim 412/500. Claimed scores are unverified.')).toBeVisible();
  await page.getByRole('button', { name: 'Play Misfit #1' }).click();
  await expect(page.getByText('#1 · 15 Nov 2026')).toBeVisible();
  await expect(cell(page, ROUND1.misfit)).toBeVisible();

  // a date with no published exhibit falls back to today
  await page.evaluate(() => localStorage.clear());
  await open(page, new Date('2026-11-18T09:00:00Z'), '/?d=2031-01-01&g=<script>#s=99999');
  await expect(page.getByRole('button', { name: "Play today's Misfit" })).toBeVisible();
  await expect(page.getByText(/They claim/)).toHaveCount(0);
});

test('corrupted save shows the restore message and does not break the game', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('misfit:v1:active', JSON.stringify({ mode: 'daily', date: '2026-11-15' }));
    localStorage.setItem('misfit:v1:run:daily:2026-11-15', '{"v":1,"phase":"repair","t":null');
  });
  await open(page);
  await expect(page.getByText("We couldn't restore this run. Your previous completed scores are safe.")).toBeVisible();
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  await expect(page.getByText('Round 1 of 5')).toBeVisible();
});

test('works when localStorage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });
  await open(page);
  await page.getByRole('button', { name: 'Try a practice round' }).click();
  await page.locator('button.cell').first().click();
  await page.getByRole('button', { name: "That's the misfit" }).click();
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.locator('.reveal-card')).toBeVisible();
  await page.getByRole('button', { name: 'Back to start', exact: true }).click();
  await expect(page.getByRole('heading', { name: "Something doesn't add up." })).toBeVisible();
});

test('help and settings are overlays that preserve the round; reset asks first', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  await cell(page, ROUND1.misfit).click();

  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible();
  await expect(page.getByText(/roughly within 5%/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(cell(page, ROUND1.misfit)).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Sound effects')).not.toBeChecked(); // sound defaults off
  await page.getByRole('button', { name: 'Erase saved results…' }).click();
  await expect(page.getByText(/Erase everything\?/)).toBeVisible();
  await page.getByRole('button', { name: 'Keep my results' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(cell(page, ROUND1.misfit)).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Erase saved results…' }).click();
  await page.getByRole('button', { name: 'Yes, erase' }).click();
  await expect(page.getByText('Saved results erased from this device.')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('misfit:')))).toEqual([]);
});

test('variant B (resize only) skips identification and is scored out of 300', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel(/^B —/).check();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByRole('heading', { name: /^Resize the/ })).toBeVisible();
    await expect(page.locator('button.cell')).toHaveCount(0);
    await page.getByRole('button', { name: 'Lock it in' }).click();
    await page.getByRole('button', { name: /Next round|See my score/ }).click();
  }
  await expect(page.getByText(/Resize-only playtest · \d{1,3}\/300 points/)).toBeVisible();
});

test('reduced motion is honoured and focus stays visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineWidth);
  expect(outline).toBe('3px');
});

for (const [width, height] of [
  [320, 568],
  [390, 844],
  [768, 1024],
  [1440, 900],
  [640, 450], // 1280×900 at 200% zoom
] as const) {
  test(`layout holds at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await open(page);
    await noOverflow(page);
    for (const name of ['Help', 'Settings']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole('button', { name: "Play today's Misfit" }).click();
    await noOverflow(page);
    // all four cells are the same size (one shared scale) and comfortably tappable
    const boxes = await page.locator('button.cell').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]));
    expect(boxes).toHaveLength(4);
    for (const [w, h] of boxes) {
      expect(w).toBeCloseTo(boxes[0][0], 1);
      expect(h).toBeCloseTo(boxes[0][1], 1);
      expect(Math.min(w, h)).toBeGreaterThanOrEqual(48);
    }
    // one pixels-per-millimetre scale across all four drawings
    const scales = await page.locator('svg.draw').evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect().width / (e as SVGSVGElement).viewBox.baseVal.width),
    );
    for (const s of scales) expect(s).toBeCloseTo(scales[0], 4);
    const labelSize = await page.locator('.label').first().evaluate((e) => getComputedStyle(e).fontSize);
    expect(labelSize).toBe('13px');
    if (width === 390) {
      // the first interaction is visible without scrolling on a typical phone
      const cta = await page.locator('.controls .btn-primary').boundingBox();
      expect(cta!.y + cta!.height).toBeLessThanOrEqual(height);
    }

    await page.locator('button.cell').first().click();
    await page.getByRole('button', { name: "That's the misfit" }).click();
    await page.getByRole('slider').fill('184'); // largest size
    await noOverflow(page);
    // the enlarged misfit stays inside its own drawing area
    const inside = await page.locator('.cell.is-target').evaluate((cellEl) => {
      const c = cellEl.querySelector('svg')!.getBoundingClientRect();
      const a = cellEl.querySelector('.art')!.getBoundingClientRect();
      return a.left >= c.left - 0.5 && a.right <= c.right + 0.5 && a.top >= c.top - 0.5 && a.bottom <= c.bottom + 0.5;
    });
    expect(inside).toBe(true);
    await page.getByRole('button', { name: 'Lock it in' }).click();
    await noOverflow(page);
    for (let i = 0; i < 5; i++) {
      const next = page.getByRole('button', { name: /Next round|See my score/ });
      await next.click();
      if (i < 4) await playRoundWithMouseUntilReveal(page);
    }
    await expect(page.getByRole('heading', { name: 'Your eye for size' })).toBeVisible();
    await noOverflow(page);
  });
}

async function playRoundWithMouseUntilReveal(page: Page) {
  await page.locator('button.cell').first().click();
  await page.getByRole('button', { name: "That's the misfit" }).click();
  await page.getByRole('button', { name: 'Lock it in' }).click();
}

test('fixture gallery lists every scene with validator output', async ({ page }) => {
  await open(page, DAY1, '/?gallery');
  await expect(page.getByRole('heading', { name: 'Fixture gallery' })).toBeVisible();
  await expect(page.locator('.gallery-scene')).toHaveCount(11); // 6 hand-made + 5 generated
  await expect(page.getByText(/5 blocking issues/)).toBeVisible();
  await expect(page.locator('.gallery .tone-bad')).toHaveCount(0);
});

const DAY1_ANSWERS = [
  { label: 'SD memory card', step: -75 },
  { label: 'Audio cassette', step: 72 },
  { label: 'Payment card (ID-1)', step: 72 },
  { label: 'Basketball (size 7)', step: 50 },
  { label: 'Golf ball', step: -60 },
];

test('a perfect game scores 500/500 and each correct fix reads "Right on scale"', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  for (const [i, a] of DAY1_ANSWERS.entries()) {
    await cell(page, a.label).click();
    await page.getByRole('button', { name: "That's the misfit" }).click();
    await expect(page.getByText('Found it. Now fix it.')).toBeVisible();
    await page.getByRole('slider').fill(String(a.step));
    await page.getByRole('button', { name: 'Lock it in' }).click();
    await expect(page.getByText('Right on scale')).toBeVisible();
    await expect(page.locator('.round-score strong')).toHaveText('100');
    await page.getByRole('button', { name: i < 4 ? 'Next round' : 'See my score' }).click();
  }
  await expect(page.getByText('5/5 spotted · 500/500 points')).toBeVisible();
  await expect(page.locator('.score-num')).toHaveText('500');
});

test('scores fall off sensibly: far-off repairs earn little, both directions', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: "Play today's Misfit" }).click();
  await cell(page, 'SD memory card').click();
  await page.getByRole('button', { name: "That's the misfit" }).click();
  await page.getByRole('slider').fill('184'); // 2.5× of an already 45%-too-big card
  await page.getByRole('button', { name: 'Lock it in' }).click();
  await expect(page.getByText(/2\d\d% too big/)).toBeVisible();
  await expect(page.locator('.round-score strong')).toHaveText('41'); // 40 for spotting it, 1 for the repair
});

test('each player gets their own random game; a friend link reproduces it exactly', async ({ browser }) => {
  const games: { seed: string; labels: string[] }[] = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await open(page, DAY1, '/');
    await page.getByRole('button', { name: "Play today's Misfit" }).click();
    await expect(page.getByText('Round 1 of 5')).toBeVisible();
    const seed = await page.evaluate(() => JSON.parse(localStorage.getItem('misfit:v1:run:daily:2026-11-15')!).seed as string);
    expect(seed).toMatch(/^[a-z0-9]{4,16}$/);
    games.push({ seed, labels: await page.locator('.label').allTextContents() });
    await context.close();
  }
  expect(new Set(games.map((g) => g.seed)).size).toBe(3);

  const friend = await (await browser.newContext()).newPage();
  await open(friend, DAY1, `/?d=2026-11-15&g=${games[0].seed}#s=300`);
  await expect(friend.getByText(/exact same five rounds/)).toBeVisible();
  await friend.getByRole('button', { name: "Play today's Misfit" }).click();
  expect(await friend.locator('.label').allTextContents()).toEqual(games[0].labels);
});

for (const seed of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']) {
  test(`random game "${seed}" plays through to a score`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, DAY1, `/?g=${seed}`);
    await page.getByRole('button', { name: "Play today's Misfit" }).click();
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      await expect(page.locator('button.cell')).toHaveCount(4);
      seen.add((await page.locator('.label').allTextContents()).join('|'));
      await page.locator('button.cell').nth(i % 4).click();
      await page.getByRole('button', { name: "That's the misfit" }).click();
      for (const step of ['-184', '184']) {
        await page.getByRole('slider').fill(step);
        const inside = await page.locator('.cell.is-target').evaluate((cellEl) => {
          const c = cellEl.querySelector('svg')!.getBoundingClientRect();
          const a = cellEl.querySelector('.art')!.getBoundingClientRect();
          return Math.max(a.width, a.height) >= 12 && a.left >= c.left - 0.5 && a.right <= c.right + 0.5 && a.top >= c.top - 0.5 && a.bottom <= c.bottom + 0.5;
        });
        expect(inside, 'misfit stays visible and inside its cell at both slider ends').toBe(true);
      }
      await page.getByRole('slider').fill('0');
      await page.getByRole('button', { name: 'Lock it in' }).click();
      await expect(page.locator('.reveal-card')).toBeVisible();
      await page.getByText('Why this size?').click();
      await expect(page.locator('details.why')).toContainText('of its real size');
      await noOverflow(page);
      await page.getByRole('button', { name: /Next round|See my score/ }).click();
    }
    expect(seen.size).toBe(5); // five different exhibits
    await expect(page.getByRole('heading', { name: 'Your eye for size' })).toBeVisible();
    await expect(page.getByText(/^\d\/5 spotted · \d{1,3}\/500 points$/)).toBeVisible();
  });
}
