# Proposal: audit-trail-exclude-actions

## Why

DqZaaktype's history card lists what changed on the case type: "Versie 4 gepubliceerd", "Variant Met welstand
toegevoegd". The audit trail also records every read, and on a busy case type the reads fill the card and push the
changes out of it.

## What changes

CnAuditTrailCard takes `excludeActions` (case-insensitive action names), and CnAuditTrailWidget hands it on from its
prop or `content.excludeActions`. The card leaves those entries out of its rows, its empty state and its "Show all"
count. When it leaves actions out it reads up to ten times `maxDisplay` entries (at most 100), so the excluded rows do
not crowd out the rest.

## Scope

nextcloud-vue; dossiq sets `excludeActions: ["read"]` on the case-type history card (R22-DASH). Widget content is open,
so no schema change.
