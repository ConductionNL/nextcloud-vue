---
kind: code
---

# Proposal: screens-dashboard-phone

## Summary

pipelinq's Mijn werk is a dashboard manifest page. On a phone (390px) its 6/6 widgets squeezed into 150px columns, the
chip group ran off the screen, and the touch targets were 34px. The old component had 44px targets and one column.

Under the board look (`look: "board"`), below 640px:

1. The grid reflows to ONE column (GridStack `columnOpts`, list layout: top to bottom, then left to right).
2. The compact segmented group (chips) wraps and its segments are 44px high.
3. The bar's controls take a row each; the switch and the select are 44px; the inline select no longer draws its label twice.
4. Record-list rows, KPI tiles and the widget Actions button are at least 44px.

## Scope

CnDashboardPage, CnSegmentedControl, CnWorkspaceFilterWidget, CnRecordListWidget (CSS and one computed); docs; unit and
harness e2e at 390px and 1280px. Without the board look nothing changes. No schema change.
