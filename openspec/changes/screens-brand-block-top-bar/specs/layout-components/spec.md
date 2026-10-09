# layout-components Delta: screens-brand-block-top-bar

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-brand-block-top-bar](../../)

## Purpose

The brand block where the screens draw it: at the start of the app's top bar,
under the board look.

## ADDED Requirements

### Requirement: The board look draws the brand block in an app top bar

Under the board look, when a brand is declared (`CnAppRoot` prop `brand`, else
`manifest.nav.brand`) and its `placement` is not `"nav"`, `CnAppRoot` SHALL
render a `CnBrandBar` across the top of the app region, and SHALL put the class
`cn-app-root--brand-bar` on its root so the navigation and the content start
below it. The bar SHALL be at least `--cn-board-topbar-height` (68px) high,
padding 0 20px 0 14px, white surface (`--color-main-background`), with a 1px
`--color-border` line at its end edge. The brand block SHALL be 237px wide, at
least 48px high, padding 0 6px, radius 8px, with 10px between the emblem and
the text. The emblem SHALL be 34px high. The organisation (`caption`) SHALL be
13px in `--color-text-maxcontrast`, and the app name (`name`) 18px at weight
700 in `--color-main-text`, in that order, one above the other. A 1px by 28px
divider in `--color-border` SHALL follow the block, and the bar SHALL offer a
default slot after the divider. Without the board look, or without a brand, the
bar SHALL NOT render and `CnAppRoot` SHALL render exactly as before.

#### Scenario: An app without CnAppNav gets the block

- **GIVEN** an app under the board look that declares `nav.brand` with an emblem, a caption and a name and replaces the navigation through the `menu` slot
- **WHEN** it renders
- **THEN** the top of the app shows the 237px block with the emblem, the organisation and the app name

#### Scenario: Without the board look nothing moves

- **GIVEN** the same manifest without `look: "board"`
- **WHEN** it renders
- **THEN** there is no top bar and `CnAppNav` draws the brand block at the top of the navigation as before

@e2e include Measure the block width (237px), emblem height (34px) and bar height (68px) against dossiq/DqKop.

### Requirement: The navigation does not draw a brand block the bar already draws

`CnAppNav` SHALL NOT render its brand block while `CnAppRoot` provides
`cnBrandInTopBar` as true. The `brand` slot of `CnAppNav` SHALL still render
when the host fills it.

#### Scenario: One block, not two

- **GIVEN** the board look with a declared brand and the default placement
- **WHEN** the shell renders
- **THEN** exactly one brand block exists, in the bar

### Requirement: An app can keep the brand block in the navigation

The manifest v2 schema SHALL accept `nav.brand.placement` as `"top-bar"` or
`"nav"`. Under the board look, `"nav"` SHALL keep the block in `CnAppNav` and
render no bar for it. Omitted, the placement SHALL be `"top-bar"` under the
board look and `"nav"` otherwise.

#### Scenario: An app keeps the old position

- **GIVEN** the board look and `nav.brand.placement: "nav"`
- **WHEN** the shell renders
- **THEN** no top bar renders and the navigation draws the block
