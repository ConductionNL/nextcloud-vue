---
status: reviewed
---

# CnWidgetWrapper Specification

## Purpose

`CnWidgetWrapper` is a widget container shell that provides a consistent visual frame for all widget types: optional header with icon and title, scrollable content area, and optional footer. It is used internally by `CnDashboardPage` to wrap each widget rendered by `CnDashboardGrid`.

---

## Requirements

### Requirement: widget container shell

CnWidgetWrapper SHALL render a flex-column container that fills its parent height, providing three distinct zones: header, content, and footer.

#### Scenario: full-height flex layout

- GIVEN a CnWidgetWrapper is placed inside a GridStack cell
- WHEN the component renders
- THEN the root element uses `display: flex`, `flex-direction: column`, and `height: 100%`
- AND the container has `overflow: hidden` to prevent content from bleeding outside the widget boundary

#### Scenario: default border and background

- GIVEN no `styleConfig` prop is provided
- WHEN the component renders
- THEN the wrapper has a `1px solid var(--color-border)` border
- AND the background is `var(--color-main-background)`

---

### Requirement: title display with show/hide toggle

CnWidgetWrapper SHALL render a header with icon and title when `showTitle` is `true`, and hide it when `false`.

#### Scenario: header visible with title text

- GIVEN `title` is `'Key Metrics'` and `showTitle` is `true`
- WHEN the component renders
- THEN a header bar is rendered with the title `'Key Metrics'` inside an `<h3>` element
- AND the header has `flex-shrink: 0` so it does not compress when content overflows

#### Scenario: header hidden

- GIVEN `showTitle` is `false`
- WHEN the component renders
- THEN no header element is rendered
- AND the content area takes the full height of the container

#### Scenario: default title fallback

- GIVEN `title` is an empty string or not provided
- WHEN the component renders with `showTitle` true
- THEN the header displays `'Widget'` as the fallback title text

---

### Requirement: widget icon display

CnWidgetWrapper SHALL display an icon in the header using either an image URL or a CSS class.

#### Scenario: icon via URL

- GIVEN `iconUrl` is `'/apps/procest/img/icon.svg'`
- WHEN the header renders
- THEN an `<img>` element is rendered with `src` set to the icon URL
- AND the image has `alt` text set to the display title
- AND the icon is sized at 24x24 pixels with `flex-shrink: 0`

#### Scenario: icon via CSS class

- GIVEN `iconUrl` is null and `iconClass` is `'icon-chart'`
- WHEN the header renders
- THEN a `<span>` element is rendered with the `icon-chart` class applied
- AND the span is sized at 24x24 pixels

#### Scenario: no icon

- GIVEN both `iconUrl` and `iconClass` are null
- WHEN the header renders
- THEN no icon element is rendered and the title starts at the left edge of the header

---

### Requirement: content area with default slot

CnWidgetWrapper SHALL render a scrollable content area via the default slot that expands to fill available space.

#### Scenario: content fills remaining space

- GIVEN the header is visible and footer is hidden
- WHEN slot content is placed in the default slot
- THEN the content area uses `flex: 1` and `min-height: 0` to fill remaining vertical space
- AND the content area has `overflow: auto` enabling scrolling when content exceeds the area

#### Scenario: content padding

- GIVEN no custom `styleConfig.padding` is set
- WHEN the content renders
- THEN the content area has `16px` padding on all sides

---

### Requirement: header actions slot

CnWidgetWrapper SHALL support a `#header-actions` slot for placing action buttons in the header's right side.

#### Scenario: action buttons rendered

- GIVEN content is placed in the `#header-actions` slot
- WHEN the header renders
- THEN the slot content appears in the `.cn-widget-wrapper__actions` area on the right side of the header
- AND the actions area uses `display: flex` with `gap: 4px` and `flex-shrink: 0`

#### Scenario: no actions provided

- GIVEN no content is placed in the `#header-actions` slot
- WHEN the header renders
- THEN the actions area is rendered but empty, and the title takes maximum available width

---

### Requirement: footer area with slot and buttons prop

CnWidgetWrapper SHALL support an optional footer via the `#footer` slot or the `buttons` prop.

#### Scenario: footer rendered via slot

- GIVEN content is placed in the `#footer` slot
- WHEN the component renders
- THEN a footer area is rendered with a `1px solid var(--color-border)` top border
- AND the footer has `padding: 8px 16px` and `flex-shrink: 0`

#### Scenario: footer rendered via buttons prop

- GIVEN `buttons` is `[{ text: 'View all', link: '/cases' }, { text: 'Export', link: '/export' }]`
- WHEN no `#footer` slot is provided
- THEN the footer renders an `<a>` element for each button with the button text and `href` set to the link
- AND footer links are styled with `color: var(--color-primary-element)` and underline on hover

#### Scenario: no footer

- GIVEN no `#footer` slot is provided and `buttons` is an empty array
- WHEN the component renders
- THEN no footer element is rendered

---

### Requirement: style configuration

CnWidgetWrapper SHALL accept a `styleConfig` prop to customize the wrapper's visual appearance dynamically.

#### Scenario: custom background color

- GIVEN `styleConfig` is `{ backgroundColor: '#f5f5f5' }`
- WHEN the component renders
- THEN the wrapper's inline `backgroundColor` style is set to `'#f5f5f5'`

#### Scenario: custom border

- GIVEN `styleConfig` is `{ borderStyle: 'dashed', borderWidth: 2, borderColor: '#333' }`
- WHEN the component renders
- THEN the wrapper's inline border is `'2px dashed #333'`

#### Scenario: border style none

- GIVEN `styleConfig` is `{ borderStyle: 'none' }`
- WHEN the component renders
- THEN no inline border style is applied and only the default CSS border remains

#### Scenario: custom border radius

- GIVEN `styleConfig` is `{ borderRadius: 8 }`
- WHEN the component renders
- THEN the wrapper's inline `borderRadius` is `'8px'`

#### Scenario: custom padding

- GIVEN `styleConfig` is `{ padding: { top: 10, right: 20, bottom: 10, left: 20 } }`
- WHEN the component renders
- THEN the wrapper's inline padding is `'10px 20px 10px 20px'`

---

### Requirement: overflow handling

CnWidgetWrapper SHALL prevent content overflow from breaking the widget layout.

#### Scenario: root container clips overflow

- GIVEN widget content is taller than the grid cell
- WHEN the component renders
- THEN the root `.cn-widget-wrapper` has `overflow: hidden` to clip any content that escapes the flex layout

#### Scenario: content area scrolls

- GIVEN widget content exceeds the content area height
- WHEN the user views the widget
- THEN the `.cn-widget-wrapper__content` area shows a scrollbar via `overflow: auto`
- AND the header and footer remain fixed in position

---

### Requirement: title text overflow

CnWidgetWrapper SHALL handle long title text gracefully with ellipsis truncation.

#### Scenario: long title truncated

- GIVEN `title` is a string longer than the available header width
- WHEN the header renders
- THEN the title text is truncated with `text-overflow: ellipsis`
- AND `white-space: nowrap` and `overflow: hidden` are applied to prevent wrapping
- AND the parent `header-left` container has `min-width: 0` to allow flex children to shrink below content size

---

### Requirement: NL Design System theming

CnWidgetWrapper SHALL use Nextcloud CSS variables for all colors so that NL Design System theming applies automatically.

#### Scenario: theme variables in use

- GIVEN the NL Design app overrides `--color-main-background`, `--color-border`, and `--color-primary-element`
- WHEN the wrapper renders with default styling
- THEN the background uses `var(--color-main-background)`
- AND borders use `var(--color-border)`
- AND footer links use `var(--color-primary-element)`

#### Scenario: no hardcoded colors in CSS

- GIVEN the component's scoped CSS
- WHEN inspected
- THEN no hardcoded hex or rgb color values appear; all colors reference CSS custom properties

---

### Requirement: GridStack integration

CnWidgetWrapper SHALL integrate properly within CnDashboardGrid's GridStack cells, where drag and resize are managed by the parent grid.

#### Scenario: passive resize behavior

- GIVEN CnWidgetWrapper is rendered inside a GridStack `.grid-stack-item-content` element
- WHEN the user resizes the grid cell (managed by CnDashboardGrid with `editable: true`)
- THEN the wrapper flexbox layout automatically adapts to the new dimensions
- AND the content area grows or shrinks while header and footer remain fixed height

#### Scenario: external border from dashboard CSS

- GIVEN the global `dashboard.css` applies a border to `.grid-stack-item-content:has(.cn-widget-wrapper)`
- WHEN both the external CSS and the wrapper's own border are active
- THEN the widget may display a double border (known behavior; `styleConfig.borderStyle: 'none'` can suppress the wrapper's own border)

---

### Requirement: accessibility

CnWidgetWrapper SHALL follow accessibility best practices for widget containers.

#### Scenario: semantic heading for title

- GIVEN `showTitle` is `true` and `title` is `'Recent Cases'`
- WHEN the header renders
- THEN the title is wrapped in an `<h3>` element providing semantic heading structure for screen readers

#### Scenario: icon alt text

- GIVEN `iconUrl` is provided
- WHEN the icon image renders
- THEN the `<img>` element has an `alt` attribute set to the display title for screen reader context

#### Scenario: scrollable content is keyboard accessible

- GIVEN the content area has `overflow: auto` and content exceeds the visible area
- WHEN a keyboard user tabs into the widget
- THEN the content area is scrollable via keyboard (default browser behavior for overflow containers)

---

### Requirement: responsive flex behavior

CnWidgetWrapper SHALL maintain correct proportions across different widget sizes in the grid.

#### Scenario: small widget (2x2 grid units)

- GIVEN a widget is placed in a 2-column, 2-row grid cell
- WHEN the component renders
- THEN the header, content, and footer stack vertically without overlapping
- AND if total content exceeds the cell, the content area scrolls while header/footer stay visible

#### Scenario: wide widget (12x2 grid units)

- GIVEN a widget spans the full 12-column width
- WHEN the component renders
- THEN the header stretches to fill the width with the title on the left and actions on the right
- AND the content area fills the remaining height

---

## Current Implementation Status

**Already implemented -- all requirements are fulfilled:**

- **File**: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`
- **Header rendering**: Header shown when `showTitle` is true (default). Supports `iconUrl` (`<img>`) and `iconClass` (`<span>`). Title in `<h3>` with ellipsis overflow. `#header-actions` slot in header's action area.
- **Content area**: Default slot rendered in `.cn-widget-wrapper__content` with `overflow: auto` and `flex: 1` for scrolling. `min-height: 0` ensures flex shrink works correctly. Default `padding: 16px`.
- **Header actions slot**: `#header-actions` renders in `.cn-widget-wrapper__actions` div in the header.
- **Footer slot**: `#footer` slot renders in `.cn-widget-wrapper__footer` with top border. Also supports `buttons` prop (array of `{ text, link }`) for auto-generated footer links. Footer only rendered when slot is provided OR `buttons.length > 0`.
- **Style configuration**: `styleConfig` prop supports `backgroundColor`, `borderStyle`, `borderWidth`, `borderColor`, `borderRadius`, `padding` (with `top`, `right`, `bottom`, `left`). Applied via computed `wrapperStyles`.
- **Overflow handling**: Root container uses `overflow: hidden`; content area uses `overflow: auto`.
- **NL Design**: All colors via CSS custom properties -- no hardcoded values.
- **Accessibility**: Semantic `<h3>` for titles; `alt` text on icon images.
- **GridStack integration**: Flex layout adapts passively to grid cell resizing. Drag/resize managed by parent CnDashboardGrid.

**Consumer usage (MyDash):** MyDash has its own `WidgetWrapper.vue` that mirrors CnWidgetWrapper's structure but adds `editMode` with a settings cog button and `headerStyles` for header color customization -- features not yet in the shared library component.

## Standards & References

- WCAG AA: Semantic `<h3>` for widget titles; `alt` text on icon images; scrollable content area with `overflow: auto`
- Nextcloud CSS variables: `var(--color-main-background)`, `var(--color-border)`, `var(--color-primary-element)`
- NL Design System compatible: All colors via CSS variables; nldesign app overrides Nextcloud variables automatically
- Vue 2 Options API pattern
- CSS class prefix: `cn-` for all classes

## Specificity Assessment

- **Specific enough to implement?** Yes -- all 13 requirements with 25 scenarios are clearly defined and match the implementation.
- **Potential enhancements from consumer patterns:**
  - MyDash adds `editMode` prop with settings cog button -- could be upstreamed
  - MyDash adds `headerStyles` for header background/text color customization -- could be added to `styleConfig`
  - Heading level is hardcoded to `<h3>` -- could be configurable for different nesting contexts
