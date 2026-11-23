---
kind: code
---

# Proposal: parties-accepted-kinds-by-shape

## Summary

CnObjectPartiesWidget marks a party "Kind not accepted here" when its kind is not among the kinds a record accepts
(`kindsSource`). The two lists use different vocabularies:

- A party's kind comes from its schema: `person`, `organisation`, or an app's own kind such as dossiq's `colleague`.
- dossiq's `kindsSource` answers pipelinq's role kinds (`aanvrager`, `gemachtigde`), each listing the identity shapes it
  takes (`naturalPerson`, `organization`).

The widget compared `person` with `aanvrager`, so every party on a case read as not accepted ("Soort niet geaccepteerd").

## What changes

`partyKindAccepted(partyKind, accepted, own)` (utils/objectParties.js):

- When the accepted kinds name `identityShapes`, it matches the party by the shapes the listing's own kind names
  (OpenRegister `partyKinds[].identityShapes`, openregister feat/party-kind-identity-shapes).
- A kind that names no shapes cannot be judged, so it passes.
- Without shapes on the accepted kinds, the codes are compared as before.

## Scope

`src/utils/objectParties.js`, `src/components/CnObjectPartiesWidget/CnObjectPartiesWidget.vue`.
