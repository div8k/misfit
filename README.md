# MISFIT

**Four objects. One wrong size. Find it. Fix it.**

A mobile-first daily browser game. Every player gets their own randomly drawn game each day, from a pool of 13,057 possible rounds. Each of five rounds shows four objects drawn at one shared physical scale. Three are true to size; one has been enlarged or shrunk. Pick the suspect, then resize the real misfit, then watch the true size slide in over your dashed estimate. Score out of 500, with a spoiler-free result to share.

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

**Scoring.** 40 points for spotting the misfit, up to 60 for the repair. With `r = submitted / true` and `e = max(0, |ln r| − ln 1.05)`, repair points are `round(60 · exp(−3e))`. Full credit on the multiplicative interval [1/1.05, 1.05] ("roughly within 5%"). The slider is logarithmic, 0.4×–2.5× of the size first shown, in steps of about 0.5%, and always starts at 1×.

## Random games

When a player starts the day's game, the app draws a random seed (from the browser's cryptographic random source) and saves it with their run. The generator in `src/engine/schedule.ts` turns `date + seed` into five rounds:

- It picks four catalogue objects whose true sizes are within 3:1, chooses one as the misfit, and applies one of eight distortions (60–78% or 128–155% of true size).
- Every candidate round goes through the same validator as hand-made scenes, so the misfit can always be fixed inside the slider, stays inside its cell, and stays legible at 320 px.
- Within one game the five misfits are all different, and no object appears more than twice.

`npm run count:pool` enumerates the whole space: **761 fair groups of four objects and 13,057 distinct valid rounds**. A game is five of those, so two players getting the same game by chance is very unlikely (200 consecutive test seeds gave 200 different games).

Two honest caveats. All of that variety comes from the same 19 objects, so players will see the same things in new combinations; more objects are what really adds freshness. And this is a deliberate departure from the original brief, which had everyone play the same five rounds each day: scores are now only directly comparable between a player and the friends who open their challenge link, which carries the seed.

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
| `npm test` | 40/40 pass, five consecutive runs |
| `npm run test:e2e` | 29/29 pass, three consecutive runs each (28 desktop Chromium, 1 touch-emulated phone) |
| `npm run test:e2e:build` | 29/29 pass, two consecutive runs each, against the production build with its security policy |
| `npm run validate:content` | Pass; 19 objects, 6 hand-made scenes, 180/180 date+seed combinations generate |
| `npm run validate:content -- --public` | Pass: all 19 objects are marked verified (a unit test confirms one unverified object still blocks publication) |
| `npm run build` | Pass. JS 288 kB raw, **90.8 kB gzip** (target < 200 kB); CSS 4.2 kB gzip; fonts 37–41 kB each for the Latin subsets |
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

There are **five handcrafted demo scenes plus one tutorial scene**, using 19 objects. All artwork is original SVG drawn for this project.

**Measurements: checked on 15 November 2026 against their cited sources.** For each of the 19 objects, the source page was retrieved and the size read from it. Sixteen matched as entered. Four were corrected to match: the cassette shell (now 101.6 × 63.5 mm), the 12-inch LP (now the nominal 304.8 mm), the Ultimate disc (now 273 mm, and its source link was repointed to the page that states it), and the bowling pin's width (now 120.65 mm). Each object records `status: 'verified'` and the date, and the "Demo measurements" banner, which appears whenever any object is unverified, no longer shows.

The limit of that check: the cited pages are Wikipedia summaries of the standards, which are **secondary sources**. The primary documents (ISO/IEC standards, governing-body rule books) were not consulted. That is reasonable for a free prototype and not enough for a commercial launch.

Four objects are defined by a permitted range rather than a single number (AA battery, tennis ball, baseball, basketball); the notes say which value is drawn, and the whole range sits inside full credit. The LP is drawn at its nominal size, which real pressings fall slightly under.

The five hand-made scenes are kept as the curated demonstration set (`/?g=demo`) and as fixtures for the tests and gallery. What players actually get each day is a generated game, described under "Random games" above. Generated rounds have a factual, formulaic explanation rather than an edited one, and nobody has reviewed each of the 13,057 combinations by hand.

### Adding or editing content

1. **Object** — add an entry in `src/content/objects.ts`. Draw the art in millimetres so the `viewBox` equals the true width × height (no padding). Use `class="d"` / `class="ds"` for details cut out in the paper colour. Fill in the exact model or standard, the source title and URL, and notes on what was measured. Only set `status: 'verified'` and a `retrieved` date after checking the source yourself; until then leave it `'unverified'` and the game will show its demo banner.
2. **Scene** — add an entry in `src/content/scenes.ts`: four distinct object IDs in display order, the misfit, its `distortion` (displayed ÷ true), difficulty and a one-or-two sentence explanation. Leave `layout.extentMm` generous, then open `/?gallery`; it shows the minimum extent the scene needs.
3. **Validate** — `npm run validate:content` and scrub the scene's slider in the gallery. The validator enforces: four distinct objects, one misfit, positive dimensions, source and art metadata, non-blank art, art proportions matching true proportions, a distortion that is visible (≥ 15%) and whose fix sits well inside the slider, sizes within about 3:1, the resized misfit staying inside its cell, and legibility at 320–1440 px.
4. **Manifest** — add a dated entry to `MANIFESTS` with five scene IDs and versions. Changing a scene after it has run means bumping its `version`.

Content checklist per scene: Is every object a standard or a named model, not a "typical" thing? Could a plausible alternative model make the distorted size correct? Is the measured dimension stated on the reveal? Did someone other than the author try it cold?

## Genuine launch blockers

1. **Measurements are verified only against secondary sources.** All 19 objects match their cited Wikipedia pages; a commercial launch should re-check them against the primary standards.
2. **Content variety.** The generator gives 13,057 rounds, but from only 19 objects. A public launch needs a much larger verified catalogue, and ideally edited sets (the brief asked for 30 daily sets, 150 scenes) alongside the generated ones.
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
