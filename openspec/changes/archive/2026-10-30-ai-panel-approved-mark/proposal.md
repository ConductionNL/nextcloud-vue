---
kind: code
---

# Proposal: ai-panel-approved-mark

## Summary

The AI assistant panel shows, below its input, the mark an organisation set
in thematiq: its logo and "Approved by <organisation>". It tells an honest
user that this is the assistant their organisation sanctioned. With the mark
off, or without thematiq, the panel looks as it does today.

## Why

thematiq matrix row `sur-assistant-logo`. thematiq built the statement side
(archived change `2026-10-02-surfaces-assistant-approved-mark`, main spec
`assistant-approved-mark`, contract in thematiq
`docs/reference/assistant-mark.md`). Drawing it is the panel's job, and
nextcloud-vue issue #1298 asks for it with a behaviour, a response contract,
a contrast rule and a "Done when". There was no OpenSpec change for it yet;
this is that change, written from the issue and the contract as they stand on
thematiq development on 7 October 2026.

## What changes

- `CnAiChatPanel` gains a footer row under the input area.
- When thematiq is installed (`isAppInstalled('thematiq')`), the panel calls
  `GET /apps/thematiq/api/assistant-mark` once per page session and caches the
  answer at module level.
- `{"enabled": true, label, organisation, logo}`: the footer shows the logo
  (`<img>` with the contract's `alt`) and the label. `logo: null` shows the
  label alone. The label is shown as received; it is already translated.
- `{"enabled": false}`, thematiq absent, or any failure: the footer row is
  not rendered at all.

## Rows unblocked

- thematiq `sur-assistant-logo` (the drawing half; closes nextcloud-vue#1298).

## Affected projects

- `nextcloud-vue`: `CnAiChatPanel` and a small composable or util for the
  cached read.
- Consumers: every app that mounts `CnAiCompanion`. No app configuration.

## Backward compatibility

Additive. Without thematiq or with the mark off, the DOM of the panel is
unchanged. No prop is added or changed.

## Theming

Label colour `--color-main-text` on `--color-main-background`, the same
pair the panel body uses, so contrast follows Nextcloud's own light and dark
themes and NL Design overrides.
