---
sidebar_position: 25
---

# Design tokens

Every `Cn*` component reads exclusively from the **Nextcloud CSS-variable system** — no hardcoded colors, no app-specific tokens. The same component renders correctly in vanilla Nextcloud, in [NL Design System](https://nldesignsystem.nl) themed apps, and in apps with custom themes — all by changing the variable values, not the components.

This page documents the CSS variables you can rely on when overriding component styles, building custom components, or tuning a theme. Categories follow the order Nextcloud's own theming app exposes them: primary colors, backgrounds, general colors, state colors, and element structure.

:::tip Theming, not overriding
When you need to restyle a component, set the appropriate variable on a parent container — never override component CSS directly. Component CSS targets these variables; setting them propagates the change to every descendant `Cn*` and `Nc*` component.
:::

## Primary color variables

| Variable                              | Example                       | Usage                                                        |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `--color-primary`                     | `#00679e`                     | Main accent color configured by the user/admin               |
| `--color-primary-text`                | `#ffffff`                     | Text color to be used on `--color-primary`                   |
| `--color-primary-hover`               | `#3285b1`                     | Hover variant of `--color-primary`                           |
| `--color-primary-light`               | `#e5eff5`                     | Lighter variant for secondary actions                        |
| `--color-primary-light-text`          | `#00293f`                     | Text color to be used on `--color-primary-light`             |
| `--color-primary-light-hover`         | `#dbe4ea`                     | Hover variant of `--color-primary-light`                     |
| `--color-primary-element`             | `#00679e`                     | Accessibility-adjusted primary for interactive elements      |
| `--color-primary-element-text`        | `#ffffff`                     | Text color to be used on `--color-primary-element`           |
| `--color-primary-element-text-dark`   | `#f5f5f5`                     | Less contrast text variant for `--color-primary-element`     |
| `--color-primary-element-hover`       | `#005a8a`                     | Hover variant of `--color-primary-element`                   |
| `--color-primary-element-light`       | `#e5eff5`                     | Light variant for secondary interactive elements             |
| `--color-primary-element-light-text`  | `#00293f`                     | Text color to be used on `--color-primary-element-light`     |
| `--color-primary-element-light-hover` | `#dbe4ea`                     | Hover variant of `--color-primary-element-light`             |
| `--gradient-primary-background`       | `linear-gradient(40deg, ...)` | Gradient using the primary color                             |
| `--primary-invert-if-bright`          | `no`                          | CSS filter to invert icons when primary background is bright |
| `--primary-invert-if-dark`            | `invert(100%)`                | CSS filter to invert icons when primary background is dark   |

## Background variables

| Variable                              | Example                                | Usage                                                                |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `--color-background-plain`            | `#00679e`                              | Plain background color (body element)                                |
| `--color-background-plain-text`       | `#ffffff`                              | Text color to be used on `--color-background-plain`                  |
| `--color-background-hover`            | `#f5f5f5`                              | Background color for hover states                                    |
| `--color-background-dark`             | `#ededed`                              | Background for selected or emphasized elements                       |
| `--color-background-darker`           | `#dbdbdb`                              | Background for highlighted elements (not for text backgrounds)       |
| `--color-main-background`             | `#ffffff`                              | Primary background color                                             |
| `--color-main-background-rgb`         | `255,255,255`                          | RGB values of `--color-main-background` for use in rgba()            |
| `--color-main-background-translucent` | `rgba(..., .97)`                       | Near-opaque translucent variant of the main background               |
| `--color-main-background-blur`        | `rgba(..., .8)`                        | Semi-transparent variant of the main background for blurred surfaces |
| `--gradient-main-background`          | `var(--color-main-background) 0%, ...` | Gradient fading from main background to transparent                  |
| `--image-background`                  | `url('...')`                           | Optional background image set by theming                             |
| `--filter-background-blur`            | `blur(25px)`                           | Blur filter value for frosted glass surfaces                         |
| `--background-invert-if-dark`         | `no`                                   | CSS filter to invert icons on dark backgrounds                       |
| `--background-invert-if-bright`       | `invert(100%)`                         | CSS filter to invert icons on bright backgrounds                     |
| `--background-image-invert-if-bright` | `no`                                   | CSS filter to invert background images on bright backgrounds         |

## General color variables

| Variable                                   | Example                         | Usage                                                           |
| ------------------------------------------ | ------------------------------- | --------------------------------------------------------------- |
| `--color-main-text`                        | `#222222`                       | Primary text color                                              |
| `--color-text-maxcontrast`                 | `#6b6b6b`                       | Accessible subdued text with sufficient contrast                |
| `--color-text-maxcontrast-default`         | `#6b6b6b`                       | Default value of `--color-text-maxcontrast` before any override |
| `--color-text-maxcontrast-background-blur` | `#595959`                       | Contrast-adjusted text color for use on blurred backgrounds     |
| `--color-text-light`                       | `var(--color-main-text)`        | **Deprecated** — use `--color-main-text` instead                |
| `--color-text-lighter`                     | `var(--color-text-maxcontrast)` | **Deprecated** — use `--color-text-maxcontrast` instead         |
| `--color-scrollbar`                        | `rgba(34,34,34, .15)`           | Scrollbar color                                                 |
| `--color-placeholder-light`                | `#e6e6e6`                       | Light placeholder color for inputs                              |
| `--color-placeholder-dark`                 | `#cccccc`                       | Dark placeholder color for inputs                               |
| `--color-border`                           | `#ededed`                       | Standard border color                                           |
| `--color-border-dark`                      | `#dbdbdb`                       | Darker border variant                                           |
| `--color-border-maxcontrast`               | `#7d7d7d`                       | High-contrast border color for accessibility                    |
| `--color-loading-light`                    | `#cccccc`                       | Bright portion of the loading spinner                           |
| `--color-loading-dark`                     | `#444444`                       | Dark portion of the loading spinner                             |
| `--color-box-shadow-rgb`                   | `77,77,77`                      | RGB values of the shadow color for use in rgba()                |
| `--color-box-shadow`                       | `rgba(..., 0.5)`                | Standard box shadow color                                       |

## State color variables

| Variable                | Example     | Usage                                             |
| ----------------------- | ----------- | ------------------------------------------------- |
| `--color-error`         | `#DB0606`   | Error state color                                 |
| `--color-error-rgb`     | `219,6,6`   | RGB values of `--color-error` for use in rgba()   |
| `--color-error-hover`   | `#df2525`   | Hover variant of `--color-error`                  |
| `--color-error-text`    | `#c20505`   | Text color for error messages                     |
| `--color-warning`       | `#A37200`   | Warning state color                               |
| `--color-warning-rgb`   | `163,114,0` | RGB values of `--color-warning` for use in rgba() |
| `--color-warning-hover` | `#8a6000`   | Hover variant of `--color-warning`                |
| `--color-warning-text`  | `#7f5900`   | Text color for warning messages                   |
| `--color-success`       | `#2d7b41`   | Success state color                               |
| `--color-success-rgb`   | `45,123,65` | RGB values of `--color-success` for use in rgba() |
| `--color-success-hover` | `#428854`   | Hover variant of `--color-success`                |
| `--color-success-text`  | `#286c39`   | Text color for success messages                   |
| `--color-info`          | `#0071ad`   | Informational state color                         |
| `--color-info-rgb`      | `0,113,173` | RGB values of `--color-info` for use in rgba()    |
| `--color-info-hover`    | `#197fb5`   | Hover variant of `--color-info`                   |
| `--color-info-text`     | `#006499`   | Text color for info messages                      |
| `--color-favorite`      | `#A37200`   | Color for favorite/starred elements               |

## Element structure variables

Typography, sizing, spacing, animation timings, and layout dimensions. Use the spacing primitives (`--default-grid-baseline`, `--border-radius-*`) for any new layout work to stay consistent with the Nextcloud shell.

| Variable                            | Example                                  | Usage                                                                       |
| ----------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| `--font-face`                       | `system-ui, -apple-system, ...`          | UI typeface stack                                                           |
| `--default-font-size`               | `15px`                                   | Base font size                                                              |
| `--default-line-height`             | `24px`                                   | Base line height                                                            |
| `--default-grid-baseline`           | `4px`                                    | Base spacing unit — multiply for consistent spacing                         |
| `--animation-quick`                 | `100ms`                                  | Duration for quick transitions                                              |
| `--animation-slow`                  | `300ms`                                  | Duration for complex transitions                                            |
| `--border-radius`                   | `3px`                                    | Standard corner rounding                                                    |
| `--border-radius-large`             | `10px`                                   | Increased corner rounding                                                   |
| `--border-radius-rounded`           | `calc(...)`                              | Pronounced rounding, computed from clickable area                           |
| `--border-radius-element`           | `8px`                                    | Rounding for interactive elements such as buttons and inputs _(since NC30)_ |
| `--border-radius-pill`              | `100px`                                  | Full pill-shaped rounding                                                   |
| `--border-width-input`              | `1px`                                    | Border width for input elements                                             |
| `--border-width-input-focused`      | `2px`                                    | Border width for focused input elements                                     |
| `--default-clickable-area`          | `34px`                                   | Default size of interactive (clickable) elements                            |
| `--clickable-area-large`            | `48px`                                   | Large variant of the clickable area                                         |
| `--clickable-area-small`            | `24px`                                   | Small variant of the clickable area                                         |
| `--header-height`                   | `50px`                                   | Height of the main navigation bar                                           |
| `--header-menu-item-height`         | `44px`                                   | Height of navigation menu entries                                           |
| `--header-menu-profile-item-height` | `66px`                                   | Height of the profile menu entry                                            |
| `--navigation-width`                | `300px`                                  | Width of the app navigation sidebar                                         |
| `--sidebar-min-width`               | `300px`                                  | Minimum width of the app sidebar                                            |
| `--sidebar-max-width`               | `500px`                                  | Maximum width of the app sidebar                                            |
| `--list-min-width`                  | `200px`                                  | Minimum width of a content list panel                                       |
| `--list-max-width`                  | `300px`                                  | Maximum width of a content list panel                                       |
| `--body-container-margin`           | `calc(var(--default-grid-baseline) * 2)` | Margin around the main content container                                    |
| `--body-container-radius`           | `calc(var(--default-grid-baseline) * 3)` | Border radius of the main content container                                 |
| `--body-height`                     | `calc(100% - ...)`                       | Computed height of the main content container                               |
| `--breakpoint-mobile`               | `1024px`                                 | Viewport width threshold for mobile layout                                  |

## How `Cn*` components consume these

Every `cn-*` CSS class targets these variables — no hardcoded colors, no `--cn-*` custom tokens. Examples from the source:

```css
/* CnDataTable header — selected row */
.cn-data-table tr.cn-table-row--selected {
  background-color: var(--color-primary-light);
  color: var(--color-primary-light-text);
}

/* CnStatusBadge — error variant */
.cn-status-badge--error {
  background: var(--color-error);
  color: var(--color-primary-text);
}

/* CnPageHeader spacing */
.cn-page-header {
  padding: calc(var(--default-grid-baseline) * 4);
  border-radius: var(--border-radius-element);
}
```

When the host app overrides a Nextcloud variable (for example NL Design System apps remap `--color-primary-element` to a government-blue token), every `Cn*` component picks the new value up automatically.

## See also

- [Nextcloud server theming docs](https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/theming.html) — how admins set the variable values
- [NL Design System](https://nldesignsystem.nl) — Dutch government variable mapping
- [Architecture overview](../architecture/overview.md) — how `Cn*` composes `Nc*` primitives
