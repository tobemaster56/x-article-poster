# Contributing

Thanks for helping improve xPoster.

## Local Checks

Run these before opening a pull request:

```bash
npm run verify
```

This checks JavaScript syntax, the manifest, required extension files, icons, and the included Markdown fixture.

## Pull Request Guidelines

- Keep changes focused.
- Do not add dependencies unless the feature clearly needs them.
- Do not add analytics, tracking, payment gates, or license checks.
- Keep the final X Publish action manual.
- Update README or `docs/usage.zh-CN.md` when behavior changes.

## Useful Manual Test

1. Load xPoster as an unpacked Chrome extension.
2. Open `https://x.com/compose/articles`.
3. Load `fixtures/live-x-smoke.md` in the side panel.
4. Click **Check article**.
5. Click **Import**.
6. Confirm the article looks right before publishing.
