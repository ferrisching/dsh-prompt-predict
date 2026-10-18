# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the version numbers follow
[Semantic Versioning](https://semver.org/).

[中文](CHANGELOG_zh.md)

## [Unreleased]

### Fixed

- **The ghost text disappears as soon as you start typing.** DSH `0.2.1-rc.2` stopped exposing the
  composer draft through the slot's `useInput` (it now returns the Lexical input state), so the
  overlay stayed on screen and sat on top of what you were writing. It now hides on the first
  printable keypress, which needs no draft state at all, and comes back with the next prediction.
  Rendering stays on the original overlay path: an in-dock row was built and proven invisible in the
  real app, so it was dropped rather than merged.
- Verified end to end on DSH `0.2.1-rc.2`: the suggestion appears after a reply, and the first
  keystroke removes it.

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
