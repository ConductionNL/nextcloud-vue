---
status: reviewed
---

# CnTileWidget Specification

## Purpose

`CnTileWidget` renders a quick-access tile with an icon and a link. It supports four icon types (SVG, CSS class, URL, emoji) and two link types (Nextcloud app route, external URL). Used internally by `CnDashboardPage` for tile-type widgets and by consumer apps (e.g. MyDash) for dashboard shortcuts.

---

## Requirements

### Requirement: SVG icon rendering

CnTileWidget SHALL render an inline SVG icon when the tile icon type is `svg`.

#### Scenario: SVG path renders inside a viewBox

- GIVEN `tile.iconType` is `'svg'` and `tile.icon` contains an MDI SVG path string (e.g. `'M12,2C6.48,...'`)
- WHEN the component renders
- THEN an `<svg>` element with `viewBox="0 0 24 24"` is rendered containing a `<path>` with the `d` attribute set to `tile.icon`
- AND the SVG `fill` color is set to `tile.textColor` (defaulting to `'#ffffff'`)

---

### Requirement: CSS class icon rendering

CnTileWidget SHALL render a CSS class-based icon when the tile icon type is `class`.

#### Scenario: Nextcloud icon class renders with invert filter

- GIVEN `tile.iconType` is `'class'` and `tile.icon` is `'icon-folder'`
- WHEN the component renders
- THEN a `<span>` element is rendered with both the `icon` base class and the `icon-folder` class applied
- AND the span has a `brightness(0) invert(1)` CSS filter to display as white on colored backgrounds

---

### Requirement: URL image icon rendering

CnTileWidget SHALL render an image icon when the tile icon type is `url`.

#### Scenario: external image URL renders as img element

- GIVEN `tile.iconType` is `'url'` and `tile.icon` is `'https://example.com/icon.png'`
- WHEN the component renders
- THEN an `<img>` element is rendered with `src` set to the URL and `alt=""` (decorative image)
- AND the image uses `object-fit: contain` to scale proportionally within the 48x48 icon area

---

### Requirement: emoji icon rendering

CnTileWidget SHALL render an emoji character when the tile icon type is `emoji`.

#### Scenario: emoji displays at icon size

- GIVEN `tile.iconType` is `'emoji'` and `tile.icon` is a Unicode emoji character such as `'📊'`
- WHEN the component renders
- THEN the emoji is displayed in a `<span>` with `font-size: 48px`

---

### Requirement: app link navigation

CnTileWidget SHALL navigate within Nextcloud when the link type is `app`.

#### Scenario: app link uses Nextcloud router

- GIVEN `tile.linkType` is `'app'` and `tile.linkValue` is `'files'`
- WHEN the component renders the anchor element
- THEN the `href` is generated via `generateUrl('/apps/files')` from `@nextcloud/router`
- AND the `target` attribute is `'_self'` so navigation occurs in the same tab

#### Scenario: app link with path segments

- GIVEN `tile.linkType` is `'app'` and `tile.linkValue` is `'procest/zaken'`
- WHEN the component renders the anchor element
- THEN the `href` is generated via `generateUrl('/apps/procest/zaken')`

---

### Requirement: external link handling

CnTileWidget SHALL open external URLs in a new browser tab with security attributes.

#### Scenario: external URL opens in new tab

- GIVEN `tile.linkType` is `'url'` and `tile.linkValue` is `'https://example.com'`
- WHEN the component renders the anchor element
- THEN the `href` is set directly to `'https://example.com'`
- AND the `target` attribute is `'_blank'`
- AND the `rel` attribute is `'noopener noreferrer'` to prevent reverse tabnapping

#### Scenario: missing linkValue falls back to hash

- GIVEN `tile.linkType` is `'url'` and `tile.linkValue` is empty or undefined
- WHEN the component renders the anchor element
- THEN the `href` falls back to `'#'` so the page does not navigate

---

### Requirement: tile background and text color styling

CnTileWidget SHALL apply configurable background and text colors via CSS custom properties.

#### Scenario: custom colors applied

- GIVEN `tile.backgroundColor` is `'#1a73e8'` and `tile.textColor` is `'#ffffff'`
- WHEN the component renders
- THEN the CSS custom property `--cn-tile-bg` is set to `'#1a73e8'`
- AND the CSS custom property `--cn-tile-text` is set to `'#ffffff'`
- AND the tile background uses `var(--cn-tile-bg)` and text uses `var(--cn-tile-text)`

#### Scenario: default colors when none specified

- GIVEN `tile.backgroundColor` is undefined and `tile.textColor` is undefined
- WHEN the component renders
- THEN `--cn-tile-bg` defaults to `'#0082c9'` (Nextcloud blue)
- AND `--cn-tile-text` defaults to `'#ffffff'` (white)

---

### Requirement: title display

CnTileWidget SHALL display the tile title below the icon with word wrapping.

#### Scenario: title renders centered and bold

- GIVEN `tile.title` is `'Mijn Taken'`
- WHEN the component renders
- THEN the title text `'Mijn Taken'` is displayed in a `.cn-tile-widget__title` element
- AND the title is centered, bold (font-weight 700), and uses `word-break: break-word` for long text

#### Scenario: title color matches text color

- GIVEN `tile.textColor` is `'#ffcc00'`
- WHEN the component renders
- THEN the title element has an inline `color` style set to `'#ffcc00'`

---

### Requirement: hover interaction feedback

CnTileWidget SHALL provide visual feedback on hover to indicate the tile is interactive.

#### Scenario: hover scales the tile up

- GIVEN the tile is rendered and the user hovers over it
- WHEN the mouse enters the tile link area
- THEN the tile applies `transform: scale(1.02)` and `opacity: 0.95` with a 200ms ease transition

---

### Requirement: null tile guard

CnTileWidget SHALL not render anything when the tile prop is null or undefined.

#### Scenario: missing tile prop renders nothing

- GIVEN the `tile` prop is `null`
- WHEN the component renders
- THEN no DOM elements are output (the `v-if="tile"` guard prevents rendering)

---

### Requirement: grid cell sizing

CnTileWidget SHALL fill its parent grid cell completely using absolute positioning.

#### Scenario: tile fills the GridStack cell

- GIVEN the tile is placed inside a CnDashboardGrid cell (via CnDashboardPage)
- WHEN the component renders
- THEN the root element uses `position: absolute; top: 0; left: 0; width: 100%; height: 100%`
- AND the content is centered vertically and horizontally via flexbox on the link element

---

### Requirement: NL Design System theming compatibility

CnTileWidget SHALL use CSS custom properties so NL Design System theme overrides do not break tile colors.

#### Scenario: NL Design overrides do not affect explicit tile colors

- GIVEN the `nldesign` app is active and overrides Nextcloud CSS variables
- AND `tile.backgroundColor` is `'#154273'` and `tile.textColor` is `'#ffffff'`
- WHEN the component renders
- THEN the tile uses the explicitly configured colors via scoped `--cn-tile-bg` and `--cn-tile-text` custom properties
- AND NL Design global variable overrides do not affect the tile appearance because the tile sets its colors via inline style bindings

---

### Requirement: accessibility for keyboard users

CnTileWidget SHALL be navigable via keyboard since the interactive element is a native anchor tag.

#### Scenario: tile is focusable via Tab key

- GIVEN the tile is rendered with a valid link
- WHEN the user presses Tab to navigate focus
- THEN the anchor element (`<a>`) receives focus with the browser's default focus indicator
- AND pressing Enter activates the link

#### Scenario: external link is announced with security context

- GIVEN `tile.linkType` is `'url'`
- WHEN a screen reader reads the tile
- THEN the `rel="noopener noreferrer"` attribute is present for security
- AND the `target="_blank"` attribute signals to assistive technology that a new window will open

---

### Requirement: edit mode overlay (consumer extension point)

CnTileWidget in the shared library does not include edit mode, but consumer apps (e.g. MyDash) extend the tile with an edit button overlay. The library component SHALL remain simple and not include edit controls.

#### Scenario: library component has no edit mode

- GIVEN the `CnTileWidget` component from `@conduction/nextcloud-vue`
- WHEN it is rendered
- THEN no edit button or edit overlay is present
- AND consumer apps that need edit mode (like MyDash's `TileWidget.vue`) implement their own wrapper with `editMode` prop and edit button

---

### Requirement: tile configuration prop interface

CnTileWidget SHALL accept a single `tile` object prop with a well-defined shape.

#### Scenario: all tile properties are used

- GIVEN a `tile` prop with the following shape:
  ```json
  {
    "title": "Files",
    "icon": "M12,2C6.48,...",
    "iconType": "svg",
    "backgroundColor": "#0082c9",
    "textColor": "#ffffff",
    "linkType": "app",
    "linkValue": "files"
  }
  ```
- WHEN the component renders
- THEN `title` is displayed as the tile label
- AND `icon` + `iconType` determine the icon rendering strategy
- AND `backgroundColor` and `textColor` set the color scheme
- AND `linkType` + `linkValue` determine the navigation target

#### Scenario: minimal tile configuration

- GIVEN a `tile` prop with only `title`, `icon`, `iconType`, `linkType`, and `linkValue`
- WHEN the component renders
- THEN colors default to blue background (`#0082c9`) and white text (`#ffffff`)

---

## Current Implementation Status

**Already implemented -- all requirements are fulfilled:**

- **File**: `src/components/CnTileWidget/CnTileWidget.vue`
- **Icon rendering**: All four icon types implemented:
  - `svg`: Renders `<svg>` with `<path :d="tile.icon" />` and fill color from `tile.textColor`
  - `class`: Renders `<span :class="['icon', tile.icon]" />` with brightness/invert filter
  - `url`: Renders `<img :src="tile.icon" alt="" />`
  - `emoji`: Renders `<span class="cn-tile-widget__emoji">{{ tile.icon }}</span>`
- **Link behavior**: App links use `generateUrl('/apps/' + tile.linkValue)` with `target="_self"`. External URLs use `target="_blank"` with `rel="noopener noreferrer"`.
- **Visual styling**: CSS custom properties `--cn-tile-bg` and `--cn-tile-text` applied via computed `tileStyles`. Defaults: blue background (`#0082c9`), white text (`#ffffff`).
- **Title display**: Title rendered in `.cn-tile-widget__title` with `font-weight: 700`, centered, word-break enabled.
- **Hover effect**: `transform: scale(1.02)` and `opacity: 0.95` on hover.
- **Null guard**: `v-if="tile"` prevents rendering when tile is null/undefined.
- **Grid sizing**: Absolute positioning fills the parent GridStack cell.

**Not yet implemented:**
- All spec requirements are implemented. No gaps.
- Consumer apps (MyDash) extend with edit mode separately -- this is by design, not a gap.

## Standards & References

- WCAG AA: External links use `rel="noopener noreferrer"` for security; `alt=""` on decorative images; native `<a>` element ensures keyboard accessibility
- Nextcloud router: Uses `generateUrl()` from `@nextcloud/router` for app URL generation
- NL Design System: Tile uses scoped CSS custom properties (`--cn-tile-bg`, `--cn-tile-text`) that are set via inline styles, making them immune to NL Design global overrides. Default colors are hardcoded hex values as fallbacks.
- Vue 2 Options API pattern
- Consumer usage: MyDash wraps tile data from placement objects (`tileTitle`, `tileIcon`, etc.) and adds edit mode overlay

## Specificity Assessment

- **Specific enough to implement?** Yes -- all 14 requirements have clear GIVEN/WHEN/THEN scenarios tied to the actual implementation.
- **Covered aspects:** Icon rendering (4 types), link behavior (2 types + fallback), color styling, title display, hover feedback, null guard, grid sizing, NL Design compatibility, accessibility, edit mode boundary, prop interface.
- **Open questions:**
  - Should the default colors (`#0082c9`, `#ffffff`) use Nextcloud CSS variables (e.g. `var(--color-primary-element)`) instead of hardcoded hex for better theme integration?
  - Should the library component gain an optional `editMode` prop to consolidate the MyDash extension pattern?
  - The SVG `viewBox="0 0 24 24"` assumes MDI icon paths -- should other viewBox sizes be supported?
