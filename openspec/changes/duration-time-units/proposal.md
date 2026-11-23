---
kind: code
screens: [PqContactmoment]
---

# Proposal: duration-time-units

## Summary

Board PqContactmoment reads the call's length as "Duur 6 minuten". Live printed the stored "PT6M" in both the
Contactgegevens data widget and the Afhandeling facts. `format: "duration"` read only date units (days, weeks, months,
years); a time of hours or minutes fell through as written.

## What changes

- `formatTermDuration` (the data widget's and the facts widget's `duration` format): a one-unit time of hours or minutes
  reads in words through `formatIsoDuration` ("6 minutes", nl "6 minuten"). A mixed period such as `PT1H30M` still
  shows as written. Date units and the extension are unchanged.
