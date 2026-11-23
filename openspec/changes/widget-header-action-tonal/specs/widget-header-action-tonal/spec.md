# widget-header-action-tonal Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-action-tonal](../../)

## Purpose

A widget header action can be the card's tonal pill, and on a dashboard it reads the page filters.

## ADDED Requirements

### Requirement: A widget header action can be a tonal pill

A widget `headerActions` entry with `variant: "tonal"` SHALL render in the card's title row as a pill button (no
frame, fully rounded, the primary light background and text colour, the icon before the label) and SHALL run its
action on click.

#### Scenario: PqLoyaliteit Exporteren als CSV

- **GIVEN** the tier card with `{ label: "Export as CSV", icon: "TrayArrowDown", variant: "tonal", action: { type: "api-call", ... } }`
- **THEN** "Exporteren als CSV" is a tonal pill with a download icon at the end of the title row, and a click runs the download

### Requirement: A dashboard card header action reads the page filters

On a dashboard, a widget header action SHALL resolve `@workspace.<key>` tokens from the page filters, and SHALL hand
the token context to the dispatcher so an api-call fills them in its url.

#### Scenario: The tier CSV of the chosen programme

- **GIVEN** the page filter `programme` is `p-1` and the action url is `/apps/pipelinq/api/loyalty/reporting/@workspace.programme/tiers`
- **WHEN** the reader clicks "Exporteren als CSV"
- **THEN** the download reads `/apps/pipelinq/api/loyalty/reporting/p-1/tiers`
