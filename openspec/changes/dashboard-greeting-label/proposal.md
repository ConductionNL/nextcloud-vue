# Proposal: dashboard-greeting-label

## Why

The pipelinq boards open the dashboard subtitle with a label or with the date, not with a greeting. PqDashboard reads
"Klantcontact · woensdag 7 oktober 2026 · je bent beschikbaar voor gesprekken en de wachtrij", PqMijnWerk reads
"Dinsdag 7 oktober 2026 · negen items liggen bij jou". `greeting` could only write "Goedemiddag, Pieter".

## What changes

- `greeting: "date"`: the subtitle leads with today's date, written out and capitalised.
- `greeting: { label }`: the translated label stands where the greeting would be, the date still follows.
- Manifest schema 2.115.0.

`true`, `"first"`, `"full"` and no key render as before.
