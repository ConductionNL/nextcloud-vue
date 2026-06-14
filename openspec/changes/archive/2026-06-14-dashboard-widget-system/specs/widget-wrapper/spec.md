# CnWidgetWrapper Specification

## Purpose

`CnWidgetWrapper` is a widget container shell that provides a consistent visual frame for all widget types: optional header with icon and title, scrollable content area, and optional footer. It is used internally by `CnDashboardPage` to wrap each widget.

---

## ADDED Requirements

### Requirement: header rendering

CnWidgetWrapper SHALL render a header with icon and title when `showTitle` is `true`.

#### Scenario: header with icon URL

- GIVEN `title` is `'Key Metrics'` and `iconUrl` is `'/apps/procest/img/icon.svg'`
- WHEN `showTitle` is `true`
- THEN the header shows an `<img>` with the icon URL and the title text

#### Scenario: header with icon class

- GIVEN `title` is `'Chart'` and `iconClass` is `'icon-chart'`
- WHEN `showTitle` is `true`
- THEN the header shows a `<span>` with the icon class and the title text

#### Scenario: header hidden

- GIVEN `showTitle` is `false`
- WHEN the component renders
- THEN no header is rendered

---

### Requirement: content area

CnWidgetWrapper SHALL render a scrollable content area via the default slot.

#### Scenario: default slot renders widget content

- GIVEN content is placed in the default slot
- WHEN the component renders
- THEN the content is displayed in a scrollable container

---

### Requirement: header actions slot

CnWidgetWrapper SHALL support a `#header-actions` slot for extra buttons in the header.

#### Scenario: header actions rendered

- GIVEN `#header-actions` slot contains a button
- WHEN the header renders
- THEN the button appears in the header's action area

---

### Requirement: footer slot

CnWidgetWrapper SHALL support a `#footer` slot for optional footer content.

#### Scenario: footer rendered when slot provided

- GIVEN `#footer` slot contains a link
- WHEN the component renders
- THEN the footer area shows the link

#### Scenario: no footer when slot not provided

- GIVEN no `#footer` slot is provided
- WHEN the component renders
- THEN no footer element is rendered
