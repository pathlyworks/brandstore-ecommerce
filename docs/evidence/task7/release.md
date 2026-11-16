# Release v2.0.0: CI on the tag

- Release: https://github.com/pathlyworks/brandstore-ecommerce/releases/tag/v2.0.0 (asset `brandstore-web-v2.0.0.zip`, the built React app)
- Tag `v2.0.0` → commit `1cffe94` (merge of PR #19)
- CI run on the tag: https://github.com/pathlyworks/brandstore-ecommerce/actions/runs/43940231189, conclusion **success**

| Job | Result |
| :-- | :-- |
| Unit and integration tests (Vitest, jsdom, MSW) with coverage | success |
| Lint, format and build | success |
| Cross-browser smoke (webkit) | success |
| React app (web/) — lint, types, tests, build, Storybook | success |
| Cross-browser smoke (firefox) | success |
| End-to-end tests (Playwright) | success |
| Lighthouse (built site against the TechSphere API) | success |
| Deploy preview (production build of the React app) | skipped |
| Release (only on a v* tag, after every gate passed) | success |

"Deploy preview" runs on pull requests only (it was green on PR #19, run 43937571166). The Release job needs every other job and attached the build only after all of them passed.

Follow-up on `main` after the tag: PR #20 (scheduled Lighthouse alert fix), CI run 43939653285, success.
