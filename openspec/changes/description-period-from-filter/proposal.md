# Proposal: description-period-from-filter

## Why

DqProcesanalyse's description line names the period it measures, "Afgehandelde zaken januari tot en met september
2026 ·", followed by the measure and period controls. A dashboard description was a fixed sentence, so the page wrote
a long static line instead ("Knelpuntenanalyse op basis van ...") that pushed its filters onto a second row.

## What changes

A dashboard description may hold `{filter.<key>}`: it reads the active choice of that page filter as a period. An
option with `months: N` reads as the months it covers, the current month last ("november 2025 tot en met oktober
2026", the year once when both months share it). A quarter (`2026-Q3`) reads as its months, a year (`2026`) as the
year, any other option as its label. The text follows the filter when the reader changes it.

## Scope

`utils/periodOptions.js` (`periodText`), CnDashboardPage's description. Page filter options may carry `months`; no
schema change (page filter options are open objects).
