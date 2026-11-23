---
kind: code
---

# Proposal: action-dialog-fields-and-acts

## Summary

Moving dossiq onto CnActionDialog showed three gaps. dossiq's acts endpoint answers a LIST of acts (`{ acts: [{ act, allowed, reason }] }`), which a dot path cannot read. The archive dialog's eyebrow names the case number, which a plain text cannot. And PlanItemDialog asks a template, a title and a time, which the dialog had no fields for. CnActionDialog gains a list match on `permission`, an eyebrow template, and `fields`.

## Scope

- `src/components/CnActionDialog/CnActionDialog.vue`, its docs and spec.
- Schema keys needed (no bump): none; the config travels in an `open-modal` action's `props`.
