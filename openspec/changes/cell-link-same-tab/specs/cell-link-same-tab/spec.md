# cell-link-same-tab Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A link cell can open in the same tab

A `widget: "link"` cell with `widgetProps.href` SHALL open in the same tab when `widgetProps.target` is `_self` or the
resolved href starts with `#`, and in a new tab with `rel="noopener"` otherwise.

#### Scenario: DqInstellingen

- **GIVEN** the Koppelingen table with the row's settings link as `{settingsUrl}` and `target: "_self"`
- **THEN** following "Kadaster (BRK) en WOZ" opens its card on the same page
