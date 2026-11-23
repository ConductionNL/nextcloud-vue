# widget-header-open-sidebar-tab Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-open-sidebar-tab](../../)

## ADDED Requirements

### Requirement: A widget header button can open a sidebar tab

A widget header action whose action is `{ type: "open-sidebar-tab", tab }` SHALL open the page's object sidebar and request that tab, without going through the page's action dispatcher. Where the page provides no object sidebar state the button SHALL be left out.

#### Scenario: DqZaakBetrokkenen Toegang "Delen"

- GIVEN the case page with its object sidebar, and the Toegang card declaring `headerActions: [{ label: "Share", action: { type: "open-sidebar-tab", tab: "sharing" } }]`
- WHEN the user clicks "Delen"
- THEN the sidebar opens on the Sharing tab

#### Scenario: no object sidebar

- GIVEN the same card on a page without an object sidebar
- THEN the card draws no "Delen" button
