---
kind: code
---

# Proposal: screens-workspace-filter-translate

## Summary

The page bar (`layout: "bar"`) draws a sort select beside translated chips and a
translated switch. The select showed its label and its options untranslated,
though the app has the Dutch keys. The chips and the switch already ran their
texts through the host's translate; the select and radio styles did not.

## What changes

The `select` and radio styles of the workspace filter run their label, option
labels and accessible names through the injected `cnTranslate`, as the chips do.
Values are unchanged. No schema change.
