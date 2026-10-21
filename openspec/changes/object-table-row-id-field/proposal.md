# Proposal: object-table-row-id-field

## Why

A table row can only open the record it is: `rowRoute` takes the row's own id. DqTermijnen's payments table lists
forfeited-fee rows (case, case type, requester, forfeit date) whose click should open the case, not the payment.

## What changes

CnWidgetObjectTable takes `rowIdField` (a dot-path), and CnObjectListWidget reads `content.rowIdField`. With it the row
opens `rowRoute` with the id that field holds; a row whose field is empty does not link. Without it nothing changes.

## Scope

nextcloud-vue; dossiq configures the payments table (R22-DASH). Manifest widget content is open, so no schema change.
