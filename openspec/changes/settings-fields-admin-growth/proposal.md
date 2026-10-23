---
kind: code
---

# Proposal: settings-fields-admin-growth

## Summary

learniq's admin page still has hand-written sections that are almost field
lists: two buttons that open app pages, a "rotate the signing key" button that
must ask first, a token with "remove the stored token", and per source system
a code-to-group table whose groups are OpenRegister objects. Three small,
generic growths let them be declared:

- `action`: `href` (and `target`) makes it a link to a page; `confirm`
  (`confirmLabel`) asks first; `params` are sent with the post.
- `secret`: `clearable` (`clearKey`, `clearLabel`) offers removing the stored
  value.
- `pairs`: `valueSource { register, schema, labelField, valueField, limit }`
  chooses each value from OpenRegister objects, and says when the list was cut.

Reusers: pipelinq and dossiq admin sections that link into the app, integriq
credentials, pipelinq providers.

Builds on `settings-fields-lists` (branch `pl-abstract-pl5-settings-fields`).
