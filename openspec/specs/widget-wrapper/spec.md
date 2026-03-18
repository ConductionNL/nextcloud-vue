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

---

### Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **File**: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`
- **Header rendering**: Header shown when `showTitle` is true (default). Supports `iconUrl` (`<img>`) and `iconClass` (`<span>`). Title in `<h3>` with ellipsis overflow. `#header-actions` slot in header's action area.
- **Content area**: Default slot rendered in `.cn-widget-wrapper__content` with `overflow: auto` and `flex: 1` for scrolling. `min-height: 0` ensures flex shrink works correctly.
- **Header actions slot**: `#header-actions` renders in `.cn-widget-wrapper__actions` div in the header.
- **Footer slot**: `#footer` slot renders in `.cn-widget-wrapper__footer` with top border. Also supports `buttons` prop (array of `{ text, link }`) for auto-generated footer links. Footer only rendered when slot is provided OR `buttons.length > 0`.
- **Style configuration**: `styleConfig` prop supports `backgroundColor`, `borderStyle`, `borderWidth`, `borderColor`, `borderRadius`, `padding` (with `top`, `right`, `bottom`, `left`). Applied via computed `wrapperStyles`.

**Additional features not in spec:**
- `buttons` prop for auto-generating footer links without using the slot
- `styleConfig` prop for dynamic border/background/padding customization
- `displayTitle` computed defaults to `'Widget'` when title is empty

### Standards & References

- WCAG AA: Semantic `<h3>` for widget titles; scrollable content area with `overflow: auto`
- Nextcloud CSS variables: `var(--color-main-background)`, `var(--color-border)`, `var(--color-primary-element)`
- NL Design System compatible: All colors via CSS variables
- Vue 2 Options API pattern

### Specificity Assessment

- **Specific enough to implement?** Yes — all scenarios are clearly defined and implemented.
- **Missing/ambiguous:**
  - Spec does not mention the `buttons` prop for auto-generated footer links.
  - Spec does not mention the `styleConfig` prop for dynamic styling.
  - No mention of the default border (`1px solid var(--color-border)`) applied to the wrapper.
  - No accessibility requirements specified (e.g., heading level, ARIA landmarks).
- **Open questions:**
  - Should `styleConfig` override the default border, or should the default always apply?
  - Should the heading level be configurable (currently hardcoded `<h3>`)?
