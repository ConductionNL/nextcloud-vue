---
kind: code
screens: [PqBeheer]
---

# Proposal: register-group-row-size

## Summary

Board PqBeheer lists the closed register groups ("Kassa 10 soorten", "BI-export 2 soorten") as 40px list rows with
square corners and a rule under each. Live drew them 44px high with the 8px corners core gives every button.

## What changes

- CnRegisterMapping board look: a closed group row has a 40px minimum height and no corner radius. The 10px 2px padding,
  the rule and the hover ground stay. The row stays a button with a target well above the 24px WCAG 2.2 AA minimum.
