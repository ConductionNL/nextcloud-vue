---
kind: code
---

# Proposal: audit-card-exclude-actors

## Summary

Board DqSociaalDomein's side Historie lists what people did on the case:

- "Inzage medisch verslag · Fatma Kaya";
- "Toestemming vastgelegd · Fatma Kaya".

On :8080 the card's last three rows were "Zaak gewijzigd" by System. These were background jobs rewriting derived fields
(statusHistory, qualityScore, assignedGroupPublicName), and they pushed every person's entry off the card (r31).

## What changes

The audit card and widget take `excludeActors`, a list of user ids left out case-insensitively, read from
`content.excludeActors`. As with `excludeActions`, the card then reads more rows than it shows, so the rows it leaves out
do not crowd the others away.

## Scope

`src/components/CnAuditTrailCard/CnAuditTrailCard.vue`, `src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue`.
