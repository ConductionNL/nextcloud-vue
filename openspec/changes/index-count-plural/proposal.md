---
kind: code
---

# Proposal: index-count-plural

## Summary

shillinq's invoice list reads "{total} facturen" under its title, so a list of one reads "1 facturen". `countSubtitle`
is one string with `{total}` filled in; it had no plural form.

`countSubtitle` now also takes `{ "singular": "...", "plural": "..." }`. The form is picked by the total through the
app's plural translation (`translatePlural` with the app id CnAppRoot provides as `cnAppId`), so each language applies
its own plural rules and the app's catalogue carries the forms as any other plural string. Without an app id the
singular is used for a total of one. `{total}` and, under the board look, `{shown}` are filled in.

## Scope

- `src/components/CnIndexPage/CnIndexPage.vue`: prop `countSubtitle` takes a string or an object; `countLine`;
  inject `cnAppId`.
- Manifest schema (version assigned by the coordinator): `config.countSubtitle` is a string or `{ singular, plural }`.
- A string `countSubtitle` and `countText` behave as before.
