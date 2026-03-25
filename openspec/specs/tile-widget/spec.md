# CnTileWidget Specification

## Purpose

`CnTileWidget` renders a quick-access tile with an icon and a link. It supports four icon types (SVG, CSS class, URL, emoji) and two link types (Nextcloud app route, external URL). Used internally by `CnDashboardPage` for tile-type widgets.

---

## ADDED Requirements

### Requirement: icon rendering

CnTileWidget SHALL render an icon based on the `iconType` field of the tile configuration.

#### Scenario: SVG icon

- GIVEN `tile.iconType` is `'svg'` and `tile.icon` contains inline SVG markup
- WHEN the component renders
- THEN the SVG is rendered inline

#### Scenario: CSS class icon

- GIVEN `tile.iconType` is `'class'` and `tile.icon` is `'icon-folder'`
- WHEN the component renders
- THEN a `<span>` with class `icon-folder` is rendered

#### Scenario: URL icon

- GIVEN `tile.iconType` is `'url'` and `tile.icon` is `'https://example.com/icon.png'`
- WHEN the component renders
- THEN an `<img>` with the URL as `src` is rendered

#### Scenario: emoji icon

- GIVEN `tile.iconType` is `'emoji'` and `tile.icon` is `'📊'`
- WHEN the component renders
- THEN the emoji character is displayed

---

### Requirement: link behavior

CnTileWidget SHALL navigate to the configured link when clicked.

#### Scenario: app link navigates within Nextcloud

- GIVEN `tile.linkType` is `'app'` and `tile.linkValue` is `'/apps/procest'`
- WHEN the user clicks the tile
- THEN the browser navigates to the Nextcloud app route

#### Scenario: external URL opens in new tab

- GIVEN `tile.linkType` is `'url'` and `tile.linkValue` is `'https://example.com'`
- WHEN the user clicks the tile
- THEN the URL opens in a new browser tab

---

### Requirement: visual styling

CnTileWidget SHALL apply the configured background and text colors.

#### Scenario: custom colors applied

- GIVEN `tile.backgroundColor` is `'#1a73e8'` and `tile.textColor` is `'#ffffff'`
- WHEN the component renders
- THEN the tile has blue background and white text

#### Scenario: default styling when no colors specified

- GIVEN no `backgroundColor` or `textColor` in the tile config
- WHEN the component renders
- THEN Nextcloud default CSS variable colors are used

---

### Requirement: title display

CnTileWidget SHALL display the tile title.

#### Scenario: title is shown

- GIVEN `tile.title` is `'Quick Access'`
- WHEN the component renders
- THEN "Quick Access" is displayed on the tile

---

### Current Implementation Status

**Already implemented — all requirements are fulfilled:**

- **File**: `src/components/CnTileWidget/CnTileWidget.vue`
- **Icon rendering**: All four icon types implemented:
  - `svg`: Renders `<svg>` with `<path :d="tile.icon" />` and fill color from `tile.textColor`
  - `class`: Renders `<span :class="['icon', tile.icon]" />` with brightness/invert filter
  - `url`: Renders `<img :src="tile.icon" alt="" />`
  - `emoji`: Renders `<span class="cn-tile-widget__emoji">{{ tile.icon }}</span>`
- **Link behavior**: App links use `generateUrl('/apps/' + tile.linkValue)` with `target="_self"`. External URLs use `target="_blank"` with `rel="noopener noreferrer"`.
- **Visual styling**: CSS custom properties `--cn-tile-bg` and `--cn-tile-text` applied via computed `tileStyles`. Defaults: blue background (`#0082c9`), white text (`#ffffff`).
- **Title display**: Title rendered in `.cn-tile-widget__title` with `font-weight: 700`, centered, word-break enabled.
- **Hover effect**: `transform: scale(1.02)` and `opacity: 0.95` on hover (not in spec but implemented).

**Not yet implemented:**
- All spec requirements are implemented. No gaps.

### Standards & References

- WCAG AA: External links use `rel="noopener noreferrer"` for security; `alt=""` on decorative images
- Nextcloud router: Uses `generateUrl()` from `@nextcloud/router` for app URL generation
- NL Design System: Default colors use hardcoded hex values (`#0082c9`, `#ffffff`) rather than CSS variables — these serve as fallbacks when no custom colors are configured
- Vue 2 Options API pattern

### Specificity Assessment

- **Specific enough to implement?** Yes — all scenarios are clearly defined and fully implemented.
- **Missing/ambiguous:**
  - The spec does not mention the SVG `viewBox="0 0 24 24"` assumption (expects MDI icon paths).
  - The spec says "a `<span>` with class `icon-folder`" but the implementation wraps it in `<span :class="['icon', tile.icon]">` — the `icon` base class is added automatically.
  - No mention of the hover animation effect.
  - No mention of the `v-if="tile"` guard or what happens when `tile` is null/undefined.
- **Open questions:**
  - Should the default colors (`#0082c9`, `#ffffff`) use Nextcloud CSS variables instead for better NL Design System compatibility?
