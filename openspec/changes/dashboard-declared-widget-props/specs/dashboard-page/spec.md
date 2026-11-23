# dashboard-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-declared-widget-props](../../)

## Purpose

A dashboard widget's content configures the widget; it never overrides what the widget renders on its root.

## ADDED Requirements

### Requirement: A dashboard widget receives only the content keys it declares

CnDashboardPage SHALL bind a registry widget's content keys as props only when the widget's renderer declares them,
and SHALL always pass the whole content as `content`. A renderer with `inheritAttrs: false` SHALL keep receiving every
key. An undeclared key SHALL NOT reach the renderer's root. When the renderer declares neither the key nor `content`, the
page SHALL warn once per widget type and key outside production.

#### Scenario: An undeclared key cannot override a computed value

- **GIVEN** a widget whose root component gets a label the widget computes
- **AND** the widget's content carries a `label` the widget does not declare
- **THEN** the root shows the computed label

#### Scenario: A key that reaches nothing is warned about

- **GIVEN** a widget that declares neither `content` nor `label`
- **AND** its content carries a `label`
- **THEN** the console warns once, outside production, that `label` is not passed to that widget type

#### Scenario: A declared key still arrives

- **GIVEN** a tabs widget whose content sets `showActions: false` and `ariaLabel: "Bank"`
- **THEN** the widget's `showActions` prop is false and its `content` holds both keys
- **AND** the tab strip is named "Bank" and the widget's root element carries no aria-label

#### Scenario: A widget that forwards its attributes

- **GIVEN** a widget with `inheritAttrs: false`
- **THEN** it receives every content key, as before
