# Proposal: case-action-chrome-in-dutch

## Summary

The confirm dialog, the action buttons, the action dispatcher's toasts, the transition input dialog, the write confirmation, the detail page and the Buildiq edit button speak Dutch to a Dutch reader.

## Why

Zuiddrecht rehearsal R2 (15 October 2026), a dossiq Woo case on an nl_NL instance: the handler read "Are you sure you want to continue?", "Confirm", "Action failed." and "Edit with Buildiq" in English. These components translate 34 strings in the `nextcloud-vue` domain that `l10n/nl.json` did not carry.

## What changes

- `l10n/nl.json` and `l10n/en.json` get the 34 strings.
- `tests/l10n/caseActionChromeDutch.spec.js` reads every key from the seven files, so a string added later without Dutch fails.
