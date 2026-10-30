---
kind: code
---

# Proposal: interaction-form-summary-rows

## Summary

The contact log form (`interaction-form`) draws its summary textarea four rows
high. Board PqDashboard draws the "Nieuw contactmoment" summary lower, so the
form ran 30px taller than drawn. `content.summaryRows` sets the rows; without
it the textarea keeps four.
