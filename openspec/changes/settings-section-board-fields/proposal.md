---
kind: code
---

# Proposal: settings-section-board-fields

## Summary

The boards draw a settings card's text fields with the label above the control (PqBeheer Leadbeheer "Verouderd na (dagen)", PqBeheerKassa Btw). Nextcloud's `NcTextField` and `NcTextArea` float the label inside the border, so pipelinq's Leadbeheer and VatRatesSettings read differently from the board.

In the board look, inside a settings section, the stylesheet now moves the field's own label above the control (14px, 600, main text colour) and gives the field room for it; the placeholder shows at rest because nothing is drawn over it any more. The label keeps its `for`, so nothing changes for a screen reader, and an app changes no markup. A field that already has its label outside (`labelOutside`) is left alone. The default look is unchanged.

The header action a card such as Leadbronnen draws ("Bron toevoegen", top right) is the existing `#actions` slot of `CnSettingsSection`, which the board look already places at the end of the title row; a test now holds that.

## Scope

- `src/css/look-board.css`: three rules under `.cn-look-board .settings-section`.
- No schema change.
