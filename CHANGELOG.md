# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow
[Semantic Versioning](https://semver.org/).

[中文](CHANGELOG_zh.md)

## [0.2.10] — 2026-10-28

### Changed

- **Update notices moved out of the composer.** They now live in Settings, which checks npm automatically when opened (throttled to once per 10 minutes) and shows the copyable upgrade command; the dismiss/restore banner under the input was removed.

## [0.2.9] — 2026-10-28

### Added

- **Multi-line suggestions.** Code snippets, lists and multi-paragraph text keep their line breaks and indentation; a settings toggle turns this off for single-line-only users.
- **Switchable suggestions with round history.** Settings gained *Switchable suggestions* and *Max switches*: when enabled, ↓ generates the next suggestion and keeps it in this round's history, ↑ returns to the previous one (free), and at the configured limit (0–10, `0` = unlimited) ↓ stops generating. Turning the switch off disables ↓/↑ and hides the ↻ button.
- **One-at-a-time regeneration.** One suggestion per request; pressing ↓ (or `Ctrl/⌘+↓`) asks for a fresh single suggestion, clearing the old one immediately and showing a "generating…" placeholder while it waits.
- **Manual trigger & discoverability.** `Ctrl/⌘+Shift+Space` triggers a prediction by hand; and settings lists the shortcuts.
- **Actionable failure hint.** Failures can open the plugin settings when the host exposes that capability, or copy the "Settings → Prompt prediction" path.
- **Refresh the model list.** A *Refresh* button bypasses the Host's 60-second catalog cache.
- **History improvements.** Accepting a suggestion marks that history entry "Accepted"; each row gained an **Insert** button; *History size* `0` disables local history entirely.
- **Pause is visible in the composer**, with a live "resumes in mm:ss" hint.
- **Slow-request feedback.** A muted "generating…" placeholder appears if no event has arrived after 900 ms and disappears on the first delta.
- **Paste fallbacks.** The plugin never intercepts paste; if the editor ignores a paste, it retries the write itself (event-level and `Cmd/Ctrl+V`-level).
- **Update checks and upgrades.** Settings shows the latest npm version with copyable upgrade steps (profile pre-filled from the running environment); the composer checks once per session with a dismissible notice; a one-click restore brings a dismissed notice back. `scripts/update.sh` upgrades a profile from npm and refuses to run while the app is open.

### Changed

- **Back to one suggestion per request.** The multi-candidate experiment and its per-round limit/cache were removed; ↓ simply regenerates the next single suggestion.
- **Pasted images/files count as composer content.** A paste or drop containing files marks the composer as non-empty immediately (independently of DOM detection), so no suggestion is generated and ↓ does not request one; the flag clears when the message is sent.
- **Attachment changes around the composer clear the ghost.** The composer and its parent container are observed for image/attachment nodes being added or removed, and placeholder text is hidden in the editor's ancestors while the ghost is visible — so deleting a pasted image cannot leave ghost text on top of a placeholder.
- **Composer text detection is more robust** (caret host, focused editable, nested editables, shadow DOM). A `MutationObserver` clears the ghost when an image/attachment appears or is deleted; other edits re-render so a typed draft hides it and clearing the draft brings it back.
- **Settings layout is shrink-proof**: toggles, inputs and buttons cannot be squeezed by long hints.

### Fixed

- **Injected DSH messages no longer flip the suggestion language (#2).** `recentMessages()` now ignores `role: "user"` messages whose `source.kind` is not `user` (time-context, skill-catalog, agent-instructions), so they neither vote in language detection nor occupy the prediction context. Legacy messages without `source` still count.
- **Update-check false positives and duplicate checks**; "Test now" failures are recorded in history; fewer re-renders and re-fetches (title-only subscriptions, 5-minute efforts cache).
- **Safer failure text** (URLs/tokens redacted), **prompt-injection hardening** (`<conversation>` framing), and **head+tail trimming** for oversized messages.
- **IME composition is tracked explicitly**, late results can no longer paint over a typed/pasted draft, and arrow-key keyups are not counted as typing.
- **Attachment detection ignores toolbar icons**, and image/file chips are treated as composer content.
- **`install.sh` refuses to run while the app is open**, matching `update.sh`.

## [0.2.8] — 2026-10-24

### Added

- **The client consumes the NDJSON stream.** The composer requests `stream: true`, renders `delta` text as it arrives, clears on `reset`, finalises on `done` and records failures on `error`; a Host that does not stream (or a response without a readable body) falls back to the old single-JSON path. Reroll uses the same stream.

- **NDJSON streaming on the Host.** `POST /dsh-prompt-predict/suggest` with `stream: true` now returns `application/x-ndjson` events (`start`, `delta`, `reset`, `done`, `error`), while requests without `stream` keep the existing single-JSON response. `predictNextPrompt` gained an `onDelta` callback; retries emit `reset` before streaming the replacement.

- **Accessibility pass**: the reroll/truncation controls now have accessible names, every settings select and numeric input has an `aria-label`, pause exposes `aria-pressed`, advanced exposes `aria-expanded`, and history rows are keyboard-operable buttons with `aria-expanded`.

- **Optional real-DSH smoke test** (`npm run test:smoke`): disposable profile + local mock LLM + headless Edge/CDP, covering ghost display, composer focus scoping, reroll and pause.

### Changed

- **Compatibility verified on DSH `0.2.1-rc.3`** (the installed desktop build and the current nightly feed), not just `0.2.1-rc.2`.
- **History rows are now a real `<button>`** with the copy control as a sibling, instead of a `role=button` container; keyboard and screen-reader semantics are cleaner.
- **NDJSON deltas are coalesced every 40 ms** on the Host, with a forced flush before `reset`, `done` and `error`, so fast models no longer produce one event per token.
- **The client source is split into `client/src/` fragments**, assembled into the single `client/client.js` by `npm run build:client` (`pretest` / `prepack` run it automatically). The generated bundle is byte-identical; behaviour is unchanged.

### Fixed

- **Streaming requests keep both cancellation and a timeout.** The client stream honours the composer's AbortSignal and still aborts itself after 60 seconds; a stream-level `error` clears any half-rendered ghost, and reports `partialChars` (code-point count) in the error event and failed history (shown only when greater than zero).
- **Suggestion memory is bounded and near-duplicates are filtered.** The host keeps the last suggestion
  per session in a 100-entry LRU, so long-running apps with many sessions no longer grow it without
  limit. Duplicate detection now ignores case, whitespace, surrounding quotes and trailing sentence
  punctuation, and treats edits of up to two characters (on strings of at least eight characters) as the
  same suggestion, triggering the reroll instead of showing a reworded copy.
- **Provider catalog failures are visible and bounded.** Each provider is queried with a 3 s timeout and
  cached (60 s for success, 15 s for failure). A failing provider stays in the list with its error,
  disabled in the picker, and the settings page prints the reason instead of silently offering no models.
- **History size changes take effect immediately.** Loading or saving a smaller limit now trims the stored
  records and broadcasts the trimmed list, instead of waiting for the next prediction.
- **Undoing a history clear no longer discards new predictions.** The pre-clear snapshot is merged with
  records created after the clear, deduplicated by stable record ids (with a content fallback for older
  entries) and sorted newest-first.
- **Reasoning effort validation follows the model's actual capabilities.** `minimal`, `medium` and any
  other level advertised by `resolveModelInfo` can now be saved; the old hard-coded `off/low/high/max`
  whitelist no longer rejects them. Explicit `off` remains available even when the model exposes no
  reasoning levels, and unsupported levels are still rejected.
- **Pause and the current session id now work across independent client module instances.** The pause
  deadline and the session used by "Test now" are shared through local storage, not just module-local
  variables. Pausing also aborts an in-flight prediction instead of merely hiding its result.
- **Keyboard shortcuts are scoped to the focused composer.** `Tab`, `Alt+Right` and `Escape` no longer
  intercept input while you are in settings or another text field.
- **Rerolling updates all suggestion state.** The truncation marker follows the new response, and the
  shared failure counter is reset on success / incremented on failure just like a normal prediction.

## [0.2.7] — 2026-10-21

### Fixed

- **The ghost now disappears on paste, IME composition and drag-drop**, not only on printable keypresses.
  On DSH 0.2.1-rc.2 the slot no longer exposes the composer draft, so a `Cmd+V` (keydown carries
  `metaKey`) or a Chinese IME (`key === "Process"`) used to leave the suggestion sitting on top of the
  text the user had just inserted.
- **No suggestion is shown or requested while the composer already has a draft.** The draft guard used
  `useInput(...).draft`, which is empty since rc.2, so a half-written message could be covered by a ghost
  — and the prediction call was spent anyway. The editor's own DOM text is used instead (the placeholder
  is a sibling node, so it does not leak in), and clearing the draft re-arms the prediction.

### Added

- **A composer-side hint after repeated failures.** Two failed predictions in a row now print a short
  line where the ghost would be ("Prediction failed: …"), instead of failing silently; it goes away as
  soon as a prediction succeeds or you start typing.
- **Pause for 10 minutes.** A switch in the settings page stops predictions for ten minutes with a live
  countdown ("Paused - 7:31 left"), then resumes automatically. The deadline is stored locally so it
  survives a reload, and no prediction call is made while paused (the "Test now" button still works,
  since that is an explicit action).
- **Clearing and copying the history.** A "Clear" button wipes the stored runs (list and
  `localStorage`), and each expanded run has a "Copy" button for the suggestion text.
- **"Test now" in the settings page.** It calls the same `/suggest` endpoint the composer uses, so the
  result reflects the real chain — model route, language, length, widen-retry — and is written to the
  history like any other run. Useful right after installing or changing a setting.
- **Suggestion language and output length moved out of "Advanced"** into the main settings block; the
  advanced section keeps timeout, context size/budget, reasoning effort and history size only.

### Fixed

- **The cost table said three calls, the code allows four.** The worst case is primary + reasoning-level
  fallback + length retry + reroll; both READMEs now say four.
- **"Test now" printed a hard-coded `ms`** instead of the localised unit, and a long provider error in
  the composer failure hint is now clipped to 80 characters (the full reason stays in the history).

### Added

- **Light and dark themes.** Text, backgrounds, borders and state colours now prefer DSH's own design
  tokens (`--dsw-alias-label-*`, `--dsw-alias-bg-*`, `--dsw-alias-border-*`, `--dsw-alias-state-*`, which
  follow the app's theme) and fall back to a local light/dark palette driven by
  `prefers-color-scheme`. Live switching works without a reload.
- **Undo after clearing the history**, available for five seconds.
- **The failure counter is now shared across composer docks** (a failure in one session no longer
  resets the count for another), while the hint still only appears in the session that failed last.
- The "Test now" button explains (on hover) that it keeps working while predictions are paused.
- **The settings page shows the plugin version** next to its title (`/status` now reports it, read from
  `package.json`, so it can never drift).
- **`color-scheme` is declared on the settings card**, so native controls (number spinners, select
  popups) follow dark mode too, not just our own colours.

### Changed

- **Shorter settings hints.** The explanatory sentences under *Suggestion language*, *Output length* and
  *Pause* were cut to one short line each; the full explanation moved into the hover tooltip
  (`title`), and the pause button no longer wraps onto two lines. Hints that carry a longer explanation
  now show a dotted underline and a `help` cursor. The native `title` tooltip turned out not to appear in
  the renderer (only the cursor changed), so the explanation is rendered as a small floating bubble **below** the short hint on hover/focus. The
  bubble is absolutely positioned (the row height does not change) and `pointer-events: none`, so it can
  never block the control underneath; the row itself only gets a relative anchor. It is anchored to the
  right edge and grows leftwards, because the hint sits at the end of the row and a left-anchored bubble
  was clipped by the card's right edge. the ghost's "cut off" marker expands the settings path inline on hover instead. The ghost's "cut off"
  marker had a tooltip that could never appear (the overlay is `pointer-events: none`); that marker now
  accepts pointer events, so its hint shows on hover.

### Documentation

- **Troubleshooting section** in both READMEs: what to check when no suggestion appears, what each
  "prediction failed" reason means, how to fix a wrong suggestion language, what "cut off" implies,
  why `Tab` can do nothing, and which changes need a restart versus a reload. The cost section also
  stopped quoting the old `maxTokens: 64` default.

### Changed

- **Contrast and hit areas.** The ghost text moved from `#9aa3b2` (~2.9:1 on white) to `#6b7280`
  (~4.8:1, WCAG AA), the muted hints were darkened too, and the `Tab` / `↻` controls grew from 19px to
  24px with larger labels.
- **The setting is now a length, not a token cap.** "Output length" takes 20-400 **characters** and the
  host derives a generous token ceiling from it (CJK ~0.6 chars/token + 256 reasoning headroom, other
  languages ~2.5 chars/token), clamped to 64-1024. The character budget also goes into rule 6 of the
  prompt, so the model aims for a complete short sentence instead of running into the ceiling and being
  cut. Old configs that only have `maxTokens` are migrated on read. A reply that still gets cut (or
  spends the whole budget on reasoning) now triggers the widen-retry instead of failing outright.
- The output-cap hint no longer claims "256 tokens is about 64 Chinese characters". That estimate was
  language- and tokenizer-specific (and reasoning models spend part of the budget before any text), so
  the hint now explains what the cap does and lets the ghost's **cut off** marker tell you when to raise
  it. The truncation warning also suggests a concrete bump (512) instead of the stale 320.

## [0.2.6] — 2026-10-21

### Added

- **Suggestion language.** A new setting decides which language the ghost suggestion is written in:
  `Auto` (default) follows the conversation, or you can pin a language and every suggestion comes
  back in it — handy when you write in one language but want practice material in another. The
  dropdown lists 14 mainstream languages up front and folds the rest behind "More languages…".
  Languages with regional variants get a second **Region** dropdown: Simplified Chinese (Mainland
  China / Singapore / Malaysia), Traditional Chinese (Taiwan / Hong Kong), English (US / UK /
  Australia / Canada), Portuguese (Brazil / Portugal), Spanish (Spain / Latin America (neutral) / Mexico / Argentina / Colombia),
  French (France / Canada), German (Germany / Austria / Switzerland) and Dutch (Netherlands /
  Belgium). Each list starts with that language's CLDR default region, so there is no ambiguous
  "generic" entry. Esperanto is included as well. The variant is named
  explicitly in the prompt — *Traditional Chinese (Taiwan)*, *British English*, *Simplified Chinese* —
  so the model picks the right script, but **any valid language code is still accepted**; names are resolved
  with `Intl.DisplayNames` instead of a hand-written table, so nothing is hard-coded to that list. The
  choice is persisted with the other settings and passed to the host, which names the target language
  in the system prompt.
- UI dictionaries are still shipped for the languages DSH itself supports (`zh` / `en`); the locale
  registration now passes every dictionary instead of hard-coding the two, so a future DSH language
  needs no client change.

### Fixed

- **Suggestions follow the conversation language.** The default system prompt was written in Chinese
  and only asked the model to "use the user's recent main language", so the model followed the prompt
  and every non-Chinese conversation got a Chinese suggestion (issue #1: a Russian chat got Russian
  history and a Chinese ghost). The prompt is now English and names the target language explicitly,
  detected from the conversation — by majority vote over the last few user messages, so pasting a
  block of English logs does not flip a Russian conversation to English. The model's own
  "Suggestion:" / "Prédiction :" prefixes are stripped before the ghost is shown.

## [0.2.5] — 2026-10-20

### Added

- **Recent predictions list.** The settings page keeps the last few runs (default 10, adjustable
  1–50) with their time, session, provider/model, latency, and flags (truncated, effort downgraded,
  rerolled, failed) — plus the suggestion text itself. The list stays folded to the newest run
  (`▸ Show all` opens the rest), the newest run's text is expanded by default, and clicking another
  row's `▸` expands that one while collapsing the previous. It replaces the old single "last
  prediction" line, which showed the same run twice.
- **Session labels.** Every row names the session the run came from. DSH's host session object
  carries no title, so the label is resolved from the client session store and falls back to the tail
  of the session id.
- Records live in the app's own local storage (the Electron renderer on desktop, the page's
  `localStorage` on web) and are never uploaded, so they survive a reload. The header shows how much
  of the configured cap is in use (`3/10`).

### Fixed

- **Suggestions no longer stop mid-sentence.** The output cap defaulted to 64 tokens, not enough for
  one full Chinese sentence, so the ghost text could end abruptly. The default is now 256 and the
  ceiling 1024 (was 512); a reply that hits the cap (`finish.reason.kind === 'max-tokens'`) is
  retried once with a bigger budget (at least 384), and if it still gets cut the ghost text says
  **cut off · raise the output cap** and the settings page says the same above the history list.

## [0.2.4] — 2026-10-18

### Fixed

- **Long suggestions are no longer cut off.** The ghost text was capped at 60 characters with an
  ellipsis (`white-space: nowrap` + `text-overflow: ellipsis`), so anything longer than a short
  sentence ended in `…`. It now takes the composer's content width and wraps in place, so the whole
  suggestion stays readable; the `Tab` / `↻` / `Esc` controls follow the last line.

## [0.2.3] — 2026-10-18

### Fixed

- **The suggestion is visible again.** `0.2.2` drew it as a row inside `conversation.composer.dock`;
  the row rendered in tests and `Tab` accepted it, but it was **invisible in the real app**, so
  rendering went back to the original overlay.
- **The ghost text disappears as soon as you start typing.** DSH `0.2.1-rc.2` stopped exposing the
  composer draft through the slot's `useInput` (it now returns the Lexical input state), so the
  overlay stayed on screen and sat on top of what you were writing. It now hides on the first
  printable keypress, which needs no draft state at all, and comes back with the next prediction.
- Verified end to end on DSH `0.2.1-rc.2`: the suggestion appears after a reply, and the first
  keystroke removes it.

## [0.2.2] — 2026-10-18 (deprecated)

### Changed

- The suggestion was drawn as a row inside `conversation.composer.dock` instead of a fixed overlay.
  **Deprecated:** that row turned out not to be visible in the real app. Use `0.2.3` instead.


## [0.2.1] — 2026-10-17

### Fixed

- **The npm package page rendered the Chinese README.** npm picks the first `README.*` match in
  glob order, and `README.zh.md` sorts before `README.md`, so the Chinese file won. The Chinese
  README is now `README_zh.md`, which npm's `{README,README.*}` pattern does not match, so
  `README.md` (English) is always the one published. Supersedes `0.2.0`; no code changes.

## [0.2.0] — 2026-10-17

### Added

- **`↻` reroll** — a button next to the suggestion that asks the model for a different one
- **`Alt+→` accept piece by piece** — a couple of characters at a time in CJK, one word in Latin; the rest keeps floating and you can stop whenever you like
- **Two new advanced settings** — context budget (`maxChars`, 1000–20000 characters) and output cap (`maxTokens`, 16–512 tokens)
- **A "last prediction" line** at the bottom of the settings page: time, model, latency, whether the reasoning level was auto-downgraded or a reroll happened, and the reason when it failed
- **Chinese / English UI** that follows DSH's *Settings → Language* and switches **immediately** with no reload. Covers every client string (settings page, ghost hints) **and the validation errors / prediction failures returned by the host**
- `GET /status` accepts `?sessionId=` and reports the model that session actually uses
- An optional **`x-dsh-locale`** request header (`zh` / `en`) deciding which language errors come back in
- A client render smoke test (`test/client-render.mjs`, 18 cases) that expands the component tree through a tiny React stand-in

### Changed

- The reasoning-effort dropdown is now generated from the **session's actual model** (previously the global default model, so the two could disagree and offer an unsupported level)
- Helper calls per turn: still **1** by default, with one extra attempt only when the reasoning level needs downgrading or a suggestion needs rerolling — **three calls is the hard ceiling**, sharing a single timeout budget
- Hiding the suggestion by typing is no longer permanent for the turn: **clearing the draft brings it back**

### Fixed

- **Silent failure when the reasoning level doesn't suit the real model** — the symptom was "settings look fine but no suggestion ever appears". It now drops the level and retries once
- **Repeated suggestions**: when two consecutive turns produced the same one, the model is asked for a different one (once only, falling back to the original)
- **A partially accepted prefix that the user then deleted** produced a suggestion truncated mid-sentence (Tab inserted half of it). The full suggestion is now shown again

### Docs

- English README is now the primary `README.md` (Chinese moved to `README_zh.md`, 11 sections each, cross-linked)
- README gained the in-DSH install route, npm install and badges, the four interactions, and the new settings
- New demo assets: `docs/demo.gif`, `docs/screenshot.png`, `docs/social-preview.png`
- This file (`CHANGELOG.md` / `CHANGELOG_zh.md`)

## [0.1.0] — 2026-10-17

First public release.

### Added

- **A suggestion the moment a reply ends** — gray ghost text at the composer's first character, matching the editor's caret position, font size and line height
- **Three interactions** — `Tab` to accept, `Esc` to dismiss, start typing and it vanishes; the suggestion is not part of the conversation until accepted
- **Follows the current session model by default** — nothing is hard-coded to a provider
- **Lightweight context** — only the most recent user/assistant *text*; tool results, attachments and system prompts never leave your machine
- **A settings page** — on/off, provider / model, response timeout, context size, reasoning effort; changes apply immediately, no DSH restart
- Same-origin HTTP API: `/status`, `/catalog`, `/efforts`, `/settings`, `/suggest`
- MIT licensed; zero third-party runtime dependencies on both the host and client side
