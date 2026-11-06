# Proposal: timeline-read-failure-retry

## Why

Board DqZaakHistorie draws a failed read as a bold title, a sentence and an "Opnieuw proberen" button. The manage timeline drew one fixed sentence and offered no way to read again.

## What changes

- A failed read of the manage timeline offers Try again.
- `errorTitle` and `errorText` word a failed read in the host's own words.
