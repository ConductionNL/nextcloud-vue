# tabs-widget-actions-off Delta: tabs-widget-actions-off

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tabs-widget-actions-off](../../)

## Purpose

A page drawn without widget menus can turn off the tab strip's own Actions menu.

## ADDED Requirements

### Requirement: A manifest can turn off the tab strip's Actions menu

CnTabsWidget SHALL take `showActions`, default `true`. With `false` (from a manifest: `content.showActions: false`)
the strip SHALL draw no Actions menu, and no item the open panel lends it. Without the key the menu SHALL render as
before.

#### Scenario: Board ShDebiteurenbeheer draws no menu

- **GIVEN** a tabs widget on a dashboard with `content.showActions: false`
- **THEN** no Actions menu shows beside the strip, on any tab

#### Scenario: A tabs widget without the key

- **GIVEN** a tabs widget whose content does not set `showActions`
- **THEN** the Actions menu shows beside the strip as before
