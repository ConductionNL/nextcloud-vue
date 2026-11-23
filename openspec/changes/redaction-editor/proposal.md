---
kind: code
---

# Proposal: redaction-editor

## Summary

ARCH-AUDIT Decision-5 item (Ruben: build it generic). dossiq's DocumentRedactionDialog (1,033 lines), drawn as a page by CaseRedactionView (board DqLakken), redacts a case's partly public documents. Its unreferenced RedactionAssistDialog reviews LLM suggestions beside a rule floor. filinq's anonymisation needs the same editor. CnRedactionEditor is that editor, with the routes and the passage types in config, and a locked passage for the rule floor.

## Scope

- New `src/components/CnRedactionEditor/`, `src/utils/redactionSegments.js` (internal), exported component.
- No schema change: the page that hosts it passes the config, as dossiq's CaseRedaction page config already does.
