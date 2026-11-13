# Tests

This directory contains three layers of tests. `npm test` is the only suite that
runs without DSH; the real-DSH suites are opt-in because they launch a disposable
profile and a browser.

| Command | Scope | Current count |
|---|---|---|
| `npm test` | Host logic + client rendering | 141 host + 225 client |
| `npm run test:smoke` | Real DSH via disposable profile, mock LLM and headless Edge/CDP | 18 checks |
| `npm run test:sidebar` | Opt-in probe: real DSH + `dsh-better-sidebar`, prints sidebar DOM | diagnostic, no ghost assertion |

## Host and client tests

`test/predict.mjs` covers message trimming, suggestion normalization,
language detection (including DSH-injected user-role messages), route
registration, settings validation, streaming/JSON fallback, failure
diagnostics, empty-result retry, dedup and bilingual errors.

`test/client-render.mjs` renders the plugin with a small React stand-in. It
covers ghost rendering, Tab focus contexts, session switching, width/geometry
clamping, insertion fallbacks, paste/attachments, IME composition, history,
settings and both locales.

## Real DSH smoke

```bash
npm run test:smoke
```

Before running the suite, check the installed DSH version (`dsh --version`); the
smoke result applies to that exact host version. The suite creates a temporary DSH profile, installs this repository as a tarball,
starts a local mock LLM, launches headless Edge on a remote-debugging port and
drives the real composer over CDP.

Environment overrides:

- `DSH_SMOKE_DSH` — DSH CLI path (defaults to the installed app).
- `DSH_SMOKE_EDGE` — Edge binary.
- `DSH_SMOKE_KEEP=1` — keep the temporary directory for inspection.

Covered checks include:

- a real reply produces a ghost;
- Tab is ignored while another input is focused, accepted inside the composer;
- reroll, ↓ and ↑ switching, pause/resume;
- multi-line code suggestions and Tab insertion;
- a geometry matrix with composer widths 260/220/180/600 px, ancestor scales
  `0.8/1.25/1.5`, and a decoy composer inserted at the far left of the page;
- ghost bounds remain inside the editor in every geometry case.

## Right-sidebar probe

```bash
npm run test:sidebar
```

This is the same suite as `test:smoke` with `DSH_SMOKE_SIDEBAR=1`. It additionally
installs `dsh-better-sidebar@0.30.1` into the disposable profile, enables it,
opens the right sidebar, clicks **侧边对话(beta)**, creates a thread, sends a
message, and prints the real DOM (`SIDEBAR_DEBUG`, `SIDEBAR_AFTER_CLICK`,
`SIDEBAR_DEEP`, `SIDEBAR_GHOST`).

Stable selectors observed in that version:

- `._4BEzFa_sidechatComposerInput` — side-chat textarea;
- `._4BEzFa_sidechatSendBtn` — send button;
- `._4BEzFa_sidechat` — side-chat root.

Current finding: the side chat uses its own `TEXTAREA`, not the plugin's
`conversation.composer.dock` editor, so sending a side-chat message produces
**zero** `[data-prompt-predict-ghost]` nodes. The probe is therefore diagnostic:
it verifies the fixture can open and drive the sidebar, but it does not assert
right-sidebar ghost behavior. This matches the investigation on issue #6: the
reporter's sidebar setup/version still needs to be identified before a real
right-sidebar ghost assertion can be written.

## Adding a real right-sidebar assertion

Do it only after the exact sidebar environment is reproduced. The fixture should
open a composer that actually mounts `conversation.composer.dock`, wait for a
ghost, narrow the sidebar, and assert:

```text
ghost.left >= composer.left - tolerance
ghost.right <= composer.right + tolerance
```

If the sidebar uses a custom textarea (as `dsh-better-sidebar@0.30.1` does), the
assertion must be skipped or the plugin needs explicit support for that host;
claiming a pass without a ghost would be misleading.
