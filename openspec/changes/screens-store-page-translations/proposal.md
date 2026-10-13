---
kind: code
---

# Proposal: screens-store-page-translations

## Summary

Launchpad's store page on 2.81.0 was half English: the description from the manifest was shown as written, the page's
own texts ("Search the store", "All kinds", the note that no registry is configured) had no Dutch, and the kind chips
showed raw ids ("app-template", "adapter"). The page now runs the description through the app's translate, names
every kind by a label, and has Dutch for all its texts.

## Scope

- `src/components/CnStorePage/CnStorePage.vue`: the description through `cnTranslate`, `kindLabel`.
- `l10n/en.json`, `l10n/nl.json`: 23 entries (18 texts of the page, 5 kind labels).
- No manifest schema change.
