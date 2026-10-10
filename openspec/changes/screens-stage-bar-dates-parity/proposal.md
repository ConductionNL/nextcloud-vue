---
kind: code
---

# Proposal: screens-stage-bar-dates-parity

## Summary

dossiq DqZaak (round6/dossiq/library-gaps.md 16): the process bar reads
"Ontvangen 3 okt", "In behandeling sinds 4 okt", and nothing under the steps
still to come. The stages widget's bars variant already draws a date line
from the source's `dateField`, but prints the value as written, so an ISO date
from an endpoint reads "2026-10-04T09:00:00Z".

## What changes

Under the board look, a bar's date line that parses as a date reads in the
board's short form (`formatBoardDate`: "3 okt", the year only outside the
current year), and the current step's reads "sinds 4 okt" (new library string
`since {date}`). A value that is not a date, and every value outside the board
look, shows as written.

## Not in this change

The rest of gap 16 is app work: the bars (`variant: "bars"`) and the "Wat nu?"
card (`nextStep`, CnNextStepCard) exist; the case needs a status for a current
step, and the dossiq stages endpoint has to return the date each status was
reached as a `dateField`.
