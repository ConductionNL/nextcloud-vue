# detail-cells-code-and-pills-pass-axe Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: Code, scrolling cells and lifecycle pills pass axe

CnJsonViewer's text area SHALL have an accessible name, and SHALL be a tab stop when read-only. A CnDashboardGrid cell
whose content scrolls and holds nothing focusable SHALL be a tab stop, and SHALL stop being one once its content fits.
CnFlowLifecycleControls' published and deprecated pills SHALL draw their text in the text colour Nextcloud pairs with
their background.

#### Scenario: a catalog detail page with raw data

- **GIVEN** an officer opens a catalog in OpenCatalogi, whose detail page shows metadata and raw data in grid cells
- **THEN** axe at WCAG 2.2 AA reports no `aria-input-field-name` and no `scrollable-region-focusable` on the page

#### Scenario: a published flow

- **GIVEN** an officer opens a published flow
- **THEN** the lifecycle pill's text has a contrast of at least 4.5:1 against its background
