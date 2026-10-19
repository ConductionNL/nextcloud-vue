---
kind: code
---

# Proposal: index-header-export-source

## Summary

A header Export on an index page whose rows come from a named or endpoint source (`entitySource`, DqTeamwachtrij) opened the mass-export dialog and emitted `mass-export` to nobody: there is no OpenRegister export leaf for those rows and a manifest page has no listener. It now shows only when it can export: with `run` naming one of the page's header actions (which it then runs), or with a `@mass-export` listener. Pages listing OpenRegister objects keep it as before.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: `headerExportAvailable`, `run` on an export header button.
- Manifest: `headerButtons[].run` is a new key; the batch integration adds it to the schema.
