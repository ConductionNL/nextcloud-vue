---
kind: code
---

# Proposal: screens-ratio-stat

## Summary

PqMijnWerk's figures are "Binnen de termijn 92%" and "Gemiddelde antwoordtijd 1,2 dagen" next to counts. The `stat`
widget has a `ratio` source, but its parts share one metric, and nothing averages the time between two dates.
The aggregation endpoint also cannot express a list of values, so a count tile filtered on `status in [...]` is not
reliable.

1. `ratio` parts take their own `metric`, `field` and `via`.
2. `kind: "elapsed"`: the average between two date fields (`from`, `to`, `unit`), computed over the matching objects.
3. A count whose filter holds a list of values, or `via: "list"`, reads the list endpoint's total.

## Scope

CnStatWidget; docs; tests; harness e2e. The stat `source` is free-form, so no schema change.
