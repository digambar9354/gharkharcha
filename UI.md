# UI — Changelog & Guidelines

Purpose
- Keep a concise, chronological record of UI changes, decisions, and visual diffs.

How to use
- Update this file for every UI-affecting change (components, styles, layout).
- Add a changelog entry at the top with the template below.
- Include screenshots or GIFs in `public/assets/` and reference paths here.

Changelog Entry Template
- Date: YYYY-MM-DD
- Author: Name (@github)
- Component(s): e.g., Header, Dashboard
- Files: list of changed files
- Type: Add / Modify / Fix / Refactor / Remove
- Summary: Short description of the change
- PR / Issue: link
- Screenshots: path(s)
- Test Instructions: how to verify
- Notes: any additional context or follow-ups

Changelog
- 2026-04-22 — Created UI.md and added template. Author: team

Recording process & recommendations
- Commit message prefix: `ui:` (e.g., `ui: tweak Dashboard spacing`)
- Update this file in the same PR that introduces the UI change.
- Attach before/after screenshots and list visual test steps.
- For large design decisions, link to the related design doc or issue.

Optional automation
- Consider adding a pre-PR checklist that verifies `UI.md` was updated for UI PRs.

Notes
- This file lives at the repo root and should be human-editable.
