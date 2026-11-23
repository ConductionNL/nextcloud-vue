---
kind: code
---

# Proposal: facts-meter-row

## Summary

A facts entry can be a meter: an amount against a limit, drawn as a bar, for
quota cards (users, storage, requests of an organisation).

## What Changes

- `as: "meter"` on a facts entry, with `limitPath` or a constant `limit`.
- `format: "bytes"` on any facts entry, through `formatFileSize`.
- Dutch and English strings for "{value} of {limit}" and its over-the-limit
  form.

Widget content is not part of the manifest schema, so no schema version.
