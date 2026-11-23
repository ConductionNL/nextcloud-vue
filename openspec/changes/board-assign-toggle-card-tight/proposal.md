# Proposal: board-assign-toggle-card-tight

## Why

Board DqOverdragen draws the "Verzoeker informeren: dit is een doorzending (Awb 2:3)" choice card 76px high: label and
a two-line note. On :8080 it was 101px: 12px padding, NcCheckboxRadioSwitch's 34px row and a 19.5px note line height.

## What changes

In a board dialog, CnAssignDialog's toggle card takes 10px 14px padding, its checkbox row the 24px minimum target
(WCAG 2.2 2.5.8) with no block padding, and its note line height 1.2. Measured on :8080 with the rules injected: 79px.
The 3px over the board are the 24px target, kept on purpose.
