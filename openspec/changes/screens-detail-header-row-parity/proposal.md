---
kind: code
---

# Proposal: screens-detail-header-row-parity

## Summary

Row 2 of the board look's detail header (screens-detail-page-parity) is one
line on every detail board: pills, breadcrumb, a middle dot and the meta line
("Account Actief Accounts / R. Mulder · eHerkenning · namens ..." on
PtAccount, the same on DqZaak). Live on :8080 (portaliq PtAccount, dossiq
DqZaak) it was three lines: the pills, then the breadcrumb, then the dot and
meta. The breadcrumb is NcBreadcrumbs, which grows to the full width
(`width: 100%; flex-grow: 1`), draws each crumb as a 34px tertiary button in a
44px item, and reserves 100px for the last crumb when collapsed. The row's
flex-wrap therefore put it on a line of its own.

## What changes

Board look only (`look-board-detail.css`, under `.cn-look-board`): the row 2
breadcrumb shrinks to its content, its crumbs are 14px text with no button
padding, height or reserved width, 8px apart, and the record's crumb is plain
muted text. The page without the board look is unchanged.
