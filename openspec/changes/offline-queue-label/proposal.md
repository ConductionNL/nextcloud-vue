# Proposal: offline-queue-label

## Why

Board DqInspectie lists the device's outbox as "Molenweg 4, checklist" and "Kerkplein 7, foto". The offline queue only knew its technical fields, so the list read "submit · inspectionChecklistRun · a new record", which says nothing to an inspector.

## What changes

- `enqueueMutation` keeps an optional `label`: what the change is about in words.
- The field-inspection leaf labels a queued checklist "<planned item title>, checklist".
- CnOfflineQueue names a row by its label and falls back to the technical line without one.
- No manifest schema change. Apps that mirror the queue into a register can store the label on their own sync schema (dossiq `syncQueue.label`).
