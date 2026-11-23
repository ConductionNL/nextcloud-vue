---
kind: code
---

# Proposal: notification-matrix-nc-checkbox

## Summary

Coordinator's call (26 Oct, as DQ-L4's map layers): standard Nextcloud components win over native inputs. The board notification matrix drew the browser's native checkbox; in the board look it now draws Nextcloud's checkbox (NcCheckboxRadioSwitch's checkbox-blank-outline / checkbox-marked icons at 20px, primary when checked), keeping the native input underneath so its label, change event and focus stay as they are. The boards draw the same icons (design-system PR with DqPersoonlijkeInstellingen).

## Scope

- `CnNotificationMatrix.vue` board style, the matrix css test.
