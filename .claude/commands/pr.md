---
description: Push the current branch and open a GitHub pull request
argument-hint: [title]
model: haiku
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(git push:*), Bash(git add:*), Bash(git commit:*), Bash(npm run lint), Bash(npm run typecheck), Bash(npm run test), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh repo view:*)
---

## Context

- Current branch: !`git branch --show-current`
- Status: !`git status --short`
- Commits ahead of main: !`git log main..HEAD --oneline`
- Full diff vs main: !`git diff main...HEAD`

## Task

Create a pull request for the current branch against `main`.

1. **Refuse to run on `main`** — if the current branch is `main`, stop and tell the user to create a feature branch first.
2. If there are uncommitted changes shown in Status, stop and ask the user whether to commit them first — do not commit on their behalf without confirmation.
3. Run the project's checks before opening the PR: `npm run lint`, `npm run typecheck`, `npm run test`. If any fail, stop and show the failure — do not open a PR on top of failing checks unless the user explicitly says to proceed anyway.
4. Push the current branch to origin with `git push -u origin HEAD` if it isn't already published/up to date.
5. Compose the PR:
   - Title: use `$ARGUMENTS` if provided, otherwise derive a concise title from the commits ahead of main.
   - Body: a short summary of what changed (bullet points based on the diff/commits) and a `## Test plan` section noting that lint/typecheck/test were run.
   - Do not add any "Generated with Claude" / Claude Code footer or badge to the body.
6. Run `gh pr create --base main --title "<title>" --body "<body>"`.
7. After creation, print the PR URL from `gh pr view --json url -q .url`.

Do not add a `Co-Authored-By` trailer to the PR body or any commit made during this command — this repo's convention omits it (see project memory).
