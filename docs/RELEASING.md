# Releasing dsh-prompt-predict

This document is the maintainer release checklist. It is intentionally limited
to the public release process; internal notes stay outside the repository.

## Requirements

- Node.js and npm available; the repository has zero runtime dependencies.
- Write access to `ferrisching/dsh-prompt-predict` on GitHub and npm.
- npm account `ferrisching` with a passkey-capable browser for approval.
- **Git identity uses the GitHub noreply address**, never a personal email:
  `343508463+ferrisching@users.noreply.github.com`. This repository sets it
  locally together with `user.useConfigOnly=true`. Before publishing, verify:

  ```bash
  git log --format='%ae%n%ce' | sort -u
  ```

  Only the noreply address may appear. Never rewrite this back to a personal
  address, and do not add a global email fallback for this repository.

## 0. Confirm the running DSH version

Record the DSH version before touching the plugin version, and test against that
exact version:

```bash
dsh --version
npm view @deepseek-ai/dsh dist-tags --json
gh release list --repo deepseek-ai/deepseek-harness --limit 5
```

For the desktop nightly channel, also read the feed:

```bash
curl -sL https://download.deepseek.com/dsh-desk/feeds/mac-arm64/nightly-mac.yml | head -3
```

If the installed version is not the latest on its channel, decide explicitly
whether to upgrade first; do not silently test an unknown mix. Put the tested
DSH version in the release notes or the release commit body.

## 1. Prepare the version

1. Bump `version` in `package.json`.
2. Move `## [Unreleased]` in `CHANGELOG.md` / `CHANGELOG_zh.md` to
   `## [X.Y.Z] — YYYY-MM-DD`; keep one `Added` / `Changed` / `Fixed` section per
   release. Update install examples in both READMEs (`@X.Y.Z`, release download
   paths).
3. If this is a post-release fix series, squash commits since the previous tag
   into one release commit. Before rewriting history, create a temporary backup
   branch and tag at the current `HEAD`, verify the new tree, then
   `git push --force-with-lease`. Delete the backup only after the release is
   confirmed.

## 2. Verify

```bash
npm test           # Host + client suites
npm run test:smoke # required real-DSH smoke (requires local installs)
npm pack --dry-run --json --ignore-scripts
```

The package must contain only the intended files (`lib`, `client/client.js`,
`cordis.patch.yml`, READMEs, CHANGELOGs, LICENSE, `package.json`).

## 3. Publish with staged publishing

npm v12 turns on install-time security defaults (`allowScripts` off,
`--allow-git`/`--allow-remote` disabled). More importantly for maintainers,
2FA-bypass granular access tokens can no longer perform sensitive account
actions, and from around January 2027 they can no longer publish directly — they
can only stage a publish. This repository therefore uses staged publishing with
a human passkey approval.

```bash
npm stage publish
npm stage list
npm stage view <stage-id>
```

Wait until `status` is `staged` (validation can take a few minutes). Open:

<https://www.npmjs.com/settings/ferrisching/staged-packages>

Approve `dsh-prompt-predict@X.Y.Z` with the passkey. Do **not** use a long-lived
2FA-bypass token and do not run `npm publish` directly.

After approval, verify the published artifact by version document rather than
the packument cache:

```bash
curl -s -o /tmp/reg.json -w '%{http_code}\n' \
  https://registry.npmjs.org/dsh-prompt-predict/X.Y.Z
npm view dsh-prompt-predict@X.Y.Z version dist.shasum dist.tarball
npm view dsh-prompt-predict version          # latest must be X.Y.Z
```

## 4. Tag and GitHub Release

```bash
git tag -a vX.Y.Z -m "vX.Y.Z — <summary>"
git push origin vX.Y.Z

# Attach the exact registry artifact, not a fresh local pack.
curl -sL -o /tmp/dsh-prompt-predict-X.Y.Z.tgz \
  "$(npm view dsh-prompt-predict@X.Y.Z dist.tarball)"
shasum /tmp/dsh-prompt-predict-X.Y.Z.tgz   # must equal dist.shasum

gh release create vX.Y.Z /tmp/dsh-prompt-predict-X.Y.Z.tgz \
  --title "X.Y.Z — <summary>" \
  --notes-file /tmp/release-X.Y.Z.md
```

Release notes should mirror the CHANGELOG section and include the upgrade
command. **Every GitHub Release must also contain a `### Verification` section**
with the exact tested host and smoke count:

```markdown
### Verification

- Plugin: X.Y.Z
- DSH: <exact dsh --version output> (<channel>)
- `npm run test:smoke`: N/N pass
- Date: YYYY-MM-DD
```

Append the same row to the **Verification history** table in
`test/README.md`. A release is incomplete until both records exist; a smoke run
that was not written down does not count as release evidence.

Verify the release asset sha256/sha1 and run a clean install in a
temporary directory:

```bash
npm install dsh-prompt-predict@X.Y.Z
node -p "require('./node_modules/dsh-prompt-predict/package.json').version"
```

## 5. Finish

- Update local profiles only after the registry version is confirmed. Prefer the
  DSH Plugins page's **Update** action; the CLI fallback must run after quitting
  the app.
- Remove temporary backup branches/tags and `/tmp` profile backups once the
  release is confirmed.
- Never report a version as published before checking the registry version
  document and tarball. Published versions cannot be reused; a broken release
  needs a new patch version and a `npm deprecate` note on the old one.

## Notes for npm v12

- Consumers are unaffected while the package has no runtime dependencies, no
  `preinstall`/`install`/`postinstall` scripts and no git/remote dependencies.
- `prepack` is maintainer-only and runs during pack/publish, not on consumer
  installs.
- If install scripts or native dependencies are added, explicitly approve and
  document them before release, and test installation with npm v12 defaults.
