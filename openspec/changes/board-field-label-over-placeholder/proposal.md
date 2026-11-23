---
kind: code
---

# Proposal: board-field-label-over-placeholder

## Summary

Nextcloud's NcTextArea and NcTextField draw their label inside the field and hide the placeholder until the field takes
focus. thematiq's nldesign system sets `::placeholder { opacity: 1 !important }`, which brings the placeholder back at
rest, so the label and the placeholder are drawn over each other: dossiq's DqTaak notes field read "Een notitie
toevoegen" over "Wat heb je gevonden, wie heb je gebeld?".

Under the board look the placeholder of a field with its label inside stays hidden until focus, whatever the theme
says. A field with its label outside keeps its placeholder.

## Scope

- `src/css/form-field.css`, scoped under `.cn-look-board`. No component or schema change.
- The theme rule itself lives in thematiq (`css/systems/nldesign/theme.css`); it is named here, not changed.
