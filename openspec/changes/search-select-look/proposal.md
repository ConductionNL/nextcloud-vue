---
kind: code
---

# Proposal: search-select-look

## Summary

Boards DqOverdragen ("Nieuw team") and DqNieuweZaak ("Aanvrager") draw a single picker as a search field: a magnifier instead of the chevron, and results as rows with an avatar or icon, a name, a secondary line ("Juridische zaken · 6 leden · bezwaar, beroep en Woo-advies") and a check on the chosen one. NcSelect draws a chevron and one-line options.

CnSearchSelect is that picker, wrapping NcSelect. CnFormDialog draws a single select with it when the field carries `look: "search"`, with `optionSecondary`, `optionAvatar` and `optionIcon` for the rows. A registry form-field such as dossiq's InitiatorPicker can use the component directly.

## Scope

- New `src/components/CnSearchSelect/`, exported from the package.
- `src/components/CnFormDialog/CnFormDialog.vue`: the `look: "search"` branch for single selects (not for Nextcloud-user fields).
- Manifest: `look`, `optionSecondary`, `optionAvatar` and `optionIcon` are `fieldOverrides` keys, which take any key today; documenting them in the schema rides the next batch bump.
