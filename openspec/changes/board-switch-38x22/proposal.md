---
kind: code
---

# Proposal: board-switch-38x22

## Summary

Coordinator's cross-lane call (26 Oct): the board look's switch is 38x22, the size most boards draw (DqZoekresultaten's 42x24 amended in design-system #571). Live drew NcCheckboxRadioSwitch's 36x18 toggle icon. In the board look the icon's box is drawn as the board's pill (primary when on, field grey when off) with an 18px white knob 2px in; the svg is hidden. Input, label and focus ring stay Nextcloud's. Checked on :8080 with the CSS injected: 38x22, label 12px after.

## Scope

- `src/css/look-board.css`, a css test.
