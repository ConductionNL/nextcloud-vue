# Proposal: audit-trail-footnote

## Why

Board DqZaaktype's Historie card ends in a muted line under the trail, "Kenmerk ZT-OMV-REG": the case type's
identifier. The audit-trail widget drew only the trail.

## What changes

`CnAuditTrailWidget` takes `content.footnote`, a template translated and then filled from the page record
(`{identifier}`), drawn as a 13px muted line under the trail. A token with no value draws no line.

## Reach

Opt in. No schema change.
