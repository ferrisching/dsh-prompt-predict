# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow
[Semantic Versioning](https://semver.org/).

[中文](CHANGELOG_zh.md)

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
