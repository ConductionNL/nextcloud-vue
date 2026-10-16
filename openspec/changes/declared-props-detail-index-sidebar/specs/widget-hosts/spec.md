# widget-hosts Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [declared-props-detail-index-sidebar](../../)

## Purpose

Every surface that hosts a widget passes it its configuration the same way the dashboard does.

## ADDED Requirements

### Requirement: A widget host passes only the keys a widget declares

CnDetailWidgetHost and CnIndexPageWidgets SHALL bind a widget's content keys as props only when its component declares
them, and SHALL always pass the whole content as `content`. CnObjectSidebar SHALL bind a sidebar widget's own `props`
only when its component declares them. A component with `inheritAttrs: false` SHALL keep receiving every key. An
undeclared key SHALL NOT reach the component's root. When the component declares neither the key nor `content`, the
host SHALL warn once per widget type and key outside production.

#### Scenario: An undeclared key cannot override a computed value

- **GIVEN** a widget on a detail page or an index page whose root component gets a label the widget computes
- **AND** the widget's content carries a `label` the widget does not declare
- **THEN** the root shows the computed label
- **AND** a key the widget declares still arrives as a prop, and `content` holds both

#### Scenario: A sidebar widget's undeclared prop

- **GIVEN** a sidebar tab widget whose `props` carry a key its component does not declare
- **THEN** that key does not override the shared context on the component's root
- **AND** the console warns once outside production
