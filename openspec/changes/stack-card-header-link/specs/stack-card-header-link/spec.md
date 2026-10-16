# stack-card-header-link Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stack-card-header-link](../../)

## Purpose

Every card in a tab's stack keeps the link its manifest declares.

## ADDED Requirements

### Requirement: A stacked card draws its own header link

In a tab that stacks widgets (`widgetIds`), each card after the first SHALL draw the `headerLink` its widget declares
(on the definition, or `content.headerLink` / `viewAllRoute`) in its card header, unless its renderer reports a link of
its own. The first widget's link stays beside the tab strip.

#### Scenario: Reminder runs below open invoices

- **GIVEN** a tab stacking "Open invoices" and "Reminder runs"
- **AND** "Reminder runs" declares `content.headerLink: { label: "All reminder runs", route: "DunningRuns" }`
- **THEN** the "Reminder runs" card header draws "All reminder runs"
