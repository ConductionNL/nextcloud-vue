---
kind: code
---

# Proposal: settings-fields-section

## Summary

An app's admin settings page is mostly sections that are a form over the app's settings: read them, edit a few fields, save. Every app wrote that itself (load, save, dirty state, validation, notices), and CnSettingsPage drew its own fields inline.

- `CnSettingsField` is the one settings field: the control for its type with its label, and its hint or error tied to it. Types `text`, `textarea`, `number`, `switch`, `boolean` (a checkbox), `select` (static options or options read from an endpoint, labelled through NcSelect's `inputLabel`), `password` and `secret` (replace-only). CnSettingsPage now renders its fields with it; its field types and look are unchanged.
- `CnSettingsFieldsSection` is a settings section declared as `fields`, in one to three columns. It reads `GET /apps/<appId>/api/settings` (or `url`, with `valuesPath`), saves the changed fields (one request per save target; a field may read and save at its own endpoints, so one section holds several apps' settings with no store in between) with one Save button that is on only while something changed, checks required, pattern, min and max first and marks each failing field, and says whether it saved. A secret is never shown back and is sent only when typed. An `image` field shows the current image or initials and uploads a file at once.

Both work in the default and the board look. Nothing here is app-specific, and no manifest schema key is added: these are components an admin page mounts.

## Scope

- `src/components/CnSettingsField/`, `src/components/CnSettingsFieldsSection/` (new), `src/components/CnSettingsPage/CnSettingsPage.vue`, the barrels, docs, `l10n/en.json`, `l10n/nl.json`.
