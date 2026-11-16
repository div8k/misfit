# MISFIT

**Four objects. One wrong size. Find it. Fix it.**

A mobile-first daily browser game. Every player gets their own randomly drawn game each day, from a pool of 38,635,729 possible rounds. Each of five rounds shows four objects drawn at one shared physical scale. Three are true to size; one has been enlarged or shrunk. Pick the suspect, then resize the real misfit, then watch the true size slide in over your dashed estimate. Score out of 500, with a spoiler-free result to share.

"MISFIT" is a working title, not a cleared brand. This is a **prototype**: the source is public, but the game is not deployed anywhere, no analytics leave the device, and there are no accounts, ads or payments.

## Run it

Requires Node 20.19+ (built and tested on Node 26).

```bash
npm install
npm run dev
```

Then open the printed local URL. Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests for the game engine (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright; first run `npx playwright install chromium`) |
| `npm run test:e2e:build` | The same browser tests against the production build, with its security policy |
| `npm run validate:content` | Content validator; add `-- --public` for the launch check |
| `npm run count:pool` | Counts every distinct valid round the generator can produce |
| `npm run typecheck` | TypeScript only |

Useful URLs while developing:

- `/?gallery` — fixture gallery: every scene at its shared scale, validator output, and a slider to scrub each misfit across the whole range.
- `/?playtest` — adds the private playtest section to Settings in a production build (always present in `npm run dev`): variant switch and event-log download.
- `/?d=2026-11-15&g=ab12cd#s=412` — a friend link: opens that date's game with the sender's seed, so the friend plays the exact same five rounds, and shows the claimed score, labelled unverified.
- `/?g=demo` — the five hand-made demonstration scenes instead of a random game (used by the tests).

Set `PUBLIC_SITE_URL` (for example in `.env.local`) to control the URL used in share text. Without it, the current origin is used. No domain is hard-coded.

## How it is built

React 19 + TypeScript + Vite, plain CSS custom properties, inline SVG, a native range input. No UI framework, game engine, WebGL, LLM calls or backend.

```
src/engine/     Pure TypeScript, no React, fully unit-tested
  types.ts        data model
  scoring.ts      points, tolerance, slider maths
  geometry.ts     the shared scale: one mm→px multiplier per scene
  game.ts         state machine (identify → repair → reveal → next/results)
  schedule.ts     UTC dates, editions, the seeded random game generator
  storage.ts      versioned localStorage records, corruption handling, streaks
  session.ts      resume logic (an active run keeps its date past midnight)
  share.ts        spoiler-free share text, friend links, score bands
  validate.ts     content validator
  analytics.ts    provider-independent event interface + local debug sink
src/content/    Object catalogue (original SVG art + measurements), scenes, manifests
src/ui/         Board renderer, resize control, play screen, results, score card, gallery
e2e/            Playwright browser tests
scripts/        Content validator CLI
```

**Shared scale.** Every cell's SVG uses the same `viewBox` (the scene's extent in millimetres) and the same on-screen size, and every drawing is authored in millimetres. So all four objects share exactly one pixels-per-millimetre multiplier; nothing is fitted per object. Tests assert this in both the engine and the browser.

**Scoring.** 40 points for spotting the misfit, up to 60 for the repair. With `r = submitted / true` and `e = max(0, |ln r| − ln 1.10)`, repair points are `round(60 · exp(−2e))`. Full credit on the multiplicative interval [1/1.10, 1.10] ("roughly within 10%"). The slider is logarithmic, 0.4×–2.5× of the size first shown, in steps of about 0.5%, and always starts at 1×.

## Changes made on 16 November 2026 (owner's requests)

- **Everyday objects.** Ten familiar things were added (iPhone 15, iPad, Game Boy, Nintendo Switch 2, Xbox controller, Magic Mouse, crayon, Jenga block, Post-it note, stop sign), each with a size read from its source page. Thirty-three niche objects (batteries, obscure sports balls, old media formats, foreign coins and notes) were retired from play; their entries remain in the source. The catalogue was then 54 objects. A pencil, pen, Lego brick, Rubik's Cube, dice and light bulb were looked up but not added, because their pages gave no clear single size.
- **Colour.** Every object now has a realistic flat colour and a dark outline, instead of one ink colour for everything. These are simple illustrations, not photo-realistic drawings.
- **Easier.** Misfits are now at least a third off (52–66% or 150–175% of true size) so they are easier to spot; the repair step says whether the misfit is too big or too small; and full repair credit is given within roughly 10% (was 5%), with points falling away more gently. These are deliberate departures from the original brief's scoring.

### Later the same day: 110 objects and a more solid look

- **110 objects in play.** Forty-three more familiar things were added (phones, tablets, games consoles and controllers, Canadian coins and a $5 note, a playing card, a Rubik's Cube, a Barbie doll, an American football, a rugby ball, a basketball hoop, an oil drum, a beer keg, a pallet and three famous trophies), and thirteen of the earlier retirements that are reasonably familiar were brought back (euro coins and notes, the brick, the EU plate, the Blu-ray case, the 7-inch single and four sports balls). Twenty stay retired. For the doll and the trophies only the height is documented; the notes on those objects say so.
- **Shading.** Every object now has a highlight, edge shading and a contact shadow, clipped to its own shape, so it reads as a solid thing. Balls get a spherical highlight. These are still illustrations, not photographs.

### 166 objects, less Apple, and an opening screen

- **166 objects in play.** Sixty-four were added and eight Apple products retired (the iPhone 15, iPad, AirTag and AirPods case remain). New ones include a 21-inch car wheel, a car tyre, seven cars in side view, a shipping container, pizzas, a footlong sub, TV and monitor screens, Samsung and Google phones, a hockey goal, a table tennis table, a snooker table, an Oscar, the FA Cup, a carry-on suitcase, larger paper sizes, and money from the UK, Japan and the euro area.
- **Three kinds of size, labelled on each object.** *Checked*: a script fetched the cited page and matched the figures. *By name*: the size is part of the name (a 21-inch wheel, a 12-inch pizza, a 55-inch screen) and follows from arithmetic. *Typical*: no official size exists, so the figure is an estimate, stored with `status: 'typical'` and shown on the reveal as "typical size: an estimate, not an official standard". Six objects are typical: the house key, tissue box, plastic water bottle, Costco hot dog, baguette and hula hoop. For the Costco hot dog the only published spec is its weight.
- **Opening screen.** Arriving at the start page shows a large MISFIT wordmark, the rule "Three are to scale. One isn't.", a sample exhibit and "Tap to begin"; the wordmark then shrinks into the corner. A game in progress skips it.
- **The rule is hard to miss.** "Three are to scale" (green) and "One isn't" (red) now appear as two bold pills above every identify round, and the start page lists the three steps.

## Small things that came from the research

- **Unlimited practice.** The first practice is the fixed teaching round; every one after that is a fresh random round. Practice never touches the daily score or streak.
- **Score so far** is shown under the board from round two, so the total is not a surprise at the end.
- **A personal record** on the results screen: games played, average and best, from the results saved on this device.
- **Number keys 1–4** pick an object while identifying.

## Random games

When a player starts the day's game, the app draws a random seed (from the browser's cryptographic random source) and saves it with their run. The generator in `src/engine/schedule.ts` turns `date + seed` into five rounds:

- It picks four catalogue objects whose true sizes are within 3:1, chooses one as the misfit, and applies one of seven distortions (52–66% or 150–175% of true size).
- Every candidate round goes through the same validator as hand-made scenes, so the misfit can always be fixed inside the slider, stays inside its cell, and stays legible at 320 px.
- No object appears twice in a game: the five rounds show twenty different objects. The hand-made demonstration set follows the same rule.

`npm run count:pool` enumerates the whole space: **2,543,021 fair groups of four objects and 38,635,729 distinct valid rounds**. A game is five of those, so two players getting the same game by chance is very unlikely (2,000 consecutive test seeds gave 2,000 different games, and across 3,000 games every one of the 166 objects appeared and took a turn as the misfit).

One honest caveat. This is a deliberate departure from the original brief, which had everyone play the same five rounds each day: scores are now only directly comparable between a player and the friends who open their challenge link, which carries the seed.

## Security review

Checked on 15 November 2026:

| Area | Finding | Action |
|---|---|---|
| Dependencies | `npm audit`: 0 known vulnerabilities (runtime and dev) | None needed |
| Secrets | No keys, tokens or passwords in the source or git history | `.env*` files added to `.gitignore` |
| Server | There is none: no backend, accounts, database or network calls | — |
| Injected SVG artwork | Art strings are inserted as markup. Today they are static and safe, but a careless future content edit could add active content | Validator now rejects scripts, event handlers, links, embeds and `url()` in artwork |
| Outbound links | Source links open in a new tab | `rel="noreferrer noopener"`; validator requires plain `http(s)` URLs |
| URL parameters | `d`, `g` and `#s` come from untrusted links | Strict formats only; anything else is ignored. Values are rendered as text, never as markup |
| Saved data | localStorage can be edited or corrupted | Every field is validated on load (ranges, types, score consistency); tampered or inflated records are refused. Fuzz-tested |
| Built site | No policy limiting what the page may load | Production builds now ship a Content Security Policy: same-origin scripts, fonts, images and connections only; no plugins, no form posts |
| Cheating | Scores are computed in the browser, so a determined player can fake one | Accepted for a casual prototype; claimed scores are labelled unverified and there is no leaderboard |

Still to do when it is hosted: `frame-ancestors`, HSTS and `X-Content-Type-Options` can only be sent as HTTP headers, so they belong in the hosting configuration.

## Validation results

Run on 15 November 2026, macOS, Node 26.13, Chromium (Playwright headless).

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | 45/45 pass |
| `npm run test:e2e` | 32/32 pass (31 desktop Chromium, 1 touch-emulated phone) |
| `npm run test:e2e:build` | 32/32 pass against the production build with its security policy |
| `npm run validate:content` | Pass; 166 objects, 6 hand-made scenes, 180/180 date+seed combinations generate |
| `npm run validate:content -- --public` | Pass: no object is unverified (160 checked or by-name, 6 typical) (a unit test confirms one unverified object still blocks publication) |
| `npm run build` | Pass. JS about 330 kB raw, **about 104 kB gzip** (target < 200 kB); CSS 4.2 kB gzip; fonts 37–41 kB each for the Latin subsets |
| `npm audit` | 0 vulnerabilities |

The unit tests include fuzzing: 400 games of random and hostile actions (every state must save and reload unchanged, scores must stay in range), about 600 corrupted or tampered save records, and hostile URLs. Browser tests fail on any uncaught error, console error or security-policy violation.

How the brief's ten test areas are covered:

1. Scoring bounds, monotonic decline, reciprocal symmetry, exact full-credit interval — unit tests.
2. Same date and seed → same order and distortion — unit tests (cloned catalogues, different "today" values) and a browser test where a friend link reproduces another player's rounds exactly.
3. No repeat scoring; reload and midnight resume — unit tests on the reducer and storage, plus a browser test that reloads after UTC midnight.
4. Mouse, keyboard-only and touch (emulated) complete the game; a wrong pick still leads to the repair — browser tests.
5. Every answer reachable; one shared scale; no per-cell fit — unit tests over 300 generated games, plus browser checks of the rendered SVG scale and of six random games at both slider extremes.
6. 320, 390, 768, 1440 px wide, and 640×450 (equal to 1280×900 at 200% zoom): no horizontal overflow, 44 px header targets, equal cells ≥ 48 px, 13 px labels, enlarged misfit stays inside its cell — browser tests.
7. Share text and score card contain no answers; cancelled share sheet and blocked clipboard paths — unit and browser tests. The card is checked to be a 1080×1350 PNG; its contents were inspected by eye.
8. Invalid content never yields NaN or a false success; unverified content cannot enter a public manifest — unit tests.
9. Reduced motion honoured, focus ring visible, icon + text for every colour state, measured contrast for the real colour pairs — unit and browser tests.
10. All listed buttons work — exercised across the browser tests. No commercial features are in the UI.

**Not run / not verified:**

- No real phone or real touch hardware; touch is Chromium's emulation only. Safari and Firefox were not tested.
- The Web Share sheet itself cannot be driven by tests; only its resolve, cancel and failure branches are simulated.
- No screen-reader pass (VoiceOver/TalkBack). Roles and names are tested, the listening experience is not.
- True browser zoom was approximated with an equivalent viewport.
- No playtest with people. Whether "find it" adds enjoyable tension to "fix it" is still the open question this prototype exists to answer.

## Content: what is real and what is not

There are **166 objects in play**, each with original SVG artwork drawn for this project: coins, batteries, sports balls, tapes and discs, cards, paper, banknotes, number plates and a few household standards. The fixture gallery (`/?gallery`) ends with a contact sheet of all of them. There are also five handcrafted demo scenes plus one tutorial scene.

**Measurements: checked on 15 November 2026 against their cited sources.** For each object, the source page was retrieved and the size read from it. Of the first 19, sixteen matched as entered. Four were corrected to match: the cassette shell (now 101.6 × 63.5 mm), the 12-inch LP (now the nominal 304.8 mm), the Ultimate disc (now 273 mm, and its source link was repointed to the page that states it), and the bowling pin's width (now 120.65 mm). The other 41 objects were added afterwards, each entered directly from its source page; candidates whose page gave no clear figure (softball, playing card, 8-track cartridge, rugby ball and others) were left out rather than guessed. Each object records `status: 'verified'` and the date, and the "Demo measurements" banner, which appears whenever any object is unverified, no longer shows.

The limit of that check: the cited pages are Wikipedia summaries of the standards, which are **secondary sources**. The primary documents (ISO/IEC standards, governing-body rule books) were not consulted. That is reasonable for a free prototype and not enough for a commercial launch.

Several objects are defined by a permitted range rather than a single number (AA battery and most of the sports balls); the notes say which value is drawn, and the whole range sits inside full credit. The LP is drawn at its nominal size, which real pressings fall slightly under.

The five hand-made scenes are kept as the curated demonstration set (`/?g=demo`) and as fixtures for the tests and gallery. What players actually get each day is a generated game, described under "Random games" above. Generated rounds have a factual, formulaic explanation rather than an edited one, and nobody has reviewed each of the 38,635,729 combinations by hand.

### Adding or editing content

1. **Object** — add an entry in `src/content/objects.ts` or `src/content/objects-more.ts`. Draw the art in millimetres so the `viewBox` equals the true width × height (no padding). Use `class="d"` / `class="ds"` for details cut out in the paper colour. Fill in the exact model or standard, the source title and URL, and notes on what was measured. Only set `status: 'verified'` and a `retrieved` date after checking the source yourself; until then leave it `'unverified'` and the game will show its demo banner.
2. **Scene** — add an entry in `src/content/scenes.ts`: four distinct object IDs in display order, the misfit, its `distortion` (displayed ÷ true), difficulty and a one-or-two sentence explanation. Leave `layout.extentMm` generous, then open `/?gallery`; it shows the minimum extent the scene needs.
3. **Validate** — `npm run validate:content` and scrub the scene's slider in the gallery. The validator enforces: four distinct objects, one misfit, positive dimensions, source and art metadata, non-blank art, art proportions matching true proportions, a distortion that is visible (≥ 15%) and whose fix sits well inside the slider, sizes within about 3:1, the resized misfit staying inside its cell, and legibility at 320–1440 px.
4. **Manifest** — add a dated entry to `MANIFESTS` with five scene IDs and versions. Changing a scene after it has run means bumping its `version`.

Content checklist per scene: Is every object a standard or a named model, not a "typical" thing? Could a plausible alternative model make the distorted size correct? Is the measured dimension stated on the reveal? Did someone other than the author try it cold?

## Genuine launch blockers

1. **Measurements are verified only against secondary sources.** The checked objects match their cited Wikipedia pages; a commercial launch should re-check them against the primary standards.
2. **Editorial quality.** The generator gives 38,635,729 rounds from 166 objects, but nobody has reviewed them individually. A public launch would benefit from edited sets (the brief asked for 30 daily sets, 150 scenes) alongside the generated ones.
3. **No evidence yet that the game is fun.** Run the comprehension test and the A/B comparison (variant B is built in) before investing further.
4. **Trusted time and scores.** The daily uses the device clock and scores are computed in the browser; a public competition needs server time and server-side checking.
5. **Name and domain.** "MISFIT" has not been checked as a brand or domain.
6. **Analytics and privacy.** Only a local debug sink exists. Any real collector needs configuration, a privacy policy and a consent review.
7. **Cross-browser and assistive-technology testing** on real devices.

## Attribution and licences

- Game code and all object artwork, the mascot and the score card were written for this project. No code, art, copy, layout or question sets were taken from other games. The idea of estimating scale, and of spotting a wrongly scaled object, is not original to this project and is not claimed to be.
- Dependencies (not original, used under their own licences): React and React DOM (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Playwright (Apache-2.0).
- Fonts, self-hosted via the Fontsource packages: **Bricolage Grotesque** and **DM Sans**, both under the SIL Open Font License 1.1, which permits embedding and bundling. Licence texts are in `licenses/`. If the font files fail to load, the CSS falls back to Arial and the system UI font.
- Object names such as "VHS" or "SD" are used descriptively to identify standardised formats; no logos are drawn.

## Later, not now

The daily stays free. Archive packs or subscriptions are deliberately absent: there are no purchase buttons, share gates or countdowns. Extension points exist (manifests keyed by date, a versioned content catalogue, a pluggable analytics sink) but no payment infrastructure.
