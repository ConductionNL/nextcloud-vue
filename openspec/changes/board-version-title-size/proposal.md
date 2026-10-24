---
kind: code
---

# Proposal: board-version-title-size

## Summary

The board look drew the compact version card's title at 18px "as on DqInstellingenAlgemeen". The boards disagree: DqInstellingenAlgemeen and LrBeheerinstellingen draw "Versie-informatie" at 17px, OcInstellingen 18, PqBeheer 19, BqBeheerInstellingen 16 (design-system main 0d5ffd6a). r25b measured DqInstellingenAlgemeen at 17. The rule now reads `--cn-board-version-title-size`, 17px by default, and CnAdminSettingsShell's new `versionTitleSize` prop sets it for an app whose board draws another size. The earlier spec's 18px is corrected to 17.

## Scope

- `src/css/look-board.css`, `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, the board-settings-card-controls spec, tests. No schema change.
