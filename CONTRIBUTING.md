# Contributing

## Branch naming convention

```
<type>/<short-description>
```

- `type` is one of `feature`, `fix`, `docs`, `chore`, `test`, `refactor`.
- `short-description` is lowercase letters, digits and single dashes (kebab-case), describing the change, not the person.
- Whole name at most 50 characters. Branch from an up-to-date `main`; one branch per task.
- Checked by `npm run branch:check` (regex `^(feature|fix|docs|chore|test|refactor)/[a-z0-9]+(-[a-z0-9]+)*$`).

| Good                                            | Bad (why)                                |
| :---------------------------------------------- | :--------------------------------------- |
| `feature/api-contract-and-app-plan` (this task) | `Feature/Login` (capitals)               |
| `fix/cart-rounding`                             | `feat/x` (unknown type, says nothing)    |
| `docs/storage-strategy`                         | `ahmed-branch` (no type, names a person) |

## Commits

Conventional Commits: `type(scope): summary`, e.g. `feat(api): add mock server`. Types as above
plus `feat` for features and `test` for tests.

## Pull requests

1. Push the branch: `git push -u origin feature/api-contract-and-app-plan`.
2. Open a PR into `main`. CI must be green: lint, format check, tests, contract check.
3. Squash or merge; delete the branch after merging.

## Before you push

```bash
npm install          # first time (creates package-lock.json; commit it)
npm run check        # branch name, lint, format check, tests, contract
npm run format       # if format:check fails, this rewrites the files
```
