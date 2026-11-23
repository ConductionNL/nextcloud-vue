---
kind: code
---

# Proposal: duplicate-warning

## Summary

ARCH-AUDIT MOVE item. dossiq's DuplicateWarningModal (with utils/duplicateWarning.js and the mount in createCaseWithDuplicateCheck.js) warns at intake that a case may already exist, from OpenRegister's duplicate check, under a warn or block policy with an override for coordinators. pipelinq contacts need the same. CnDuplicateWarning is that warning, with `duplicateAffordances`, `candidateWithoutBlanks` and `openDuplicateWarning`.

## Scope

- New `src/components/CnDuplicateWarning/`, `src/utils/duplicateWarning.js`, `src/utils/openDuplicateWarning.js`, exported.
- No schema change.
