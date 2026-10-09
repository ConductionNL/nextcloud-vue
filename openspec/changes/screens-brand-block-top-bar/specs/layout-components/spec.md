# layout-components Delta: screens-brand-block-top-bar

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-brand-block-top-bar](../../)

## Purpose

The brand block where the screens draw it: at the start of the top bar (inside
Nextcloud's header), under the board look.

## ADDED Requirements

### Requirement: The board look draws the brand block in the Nextcloud header

Under the board look, when a brand is declared (`CnAppRoot` prop `brand`, else
`manifest.nav.brand`), its `placement` is not `"nav"` and Nextcloud's `#header`
exists, `CnAppRoot` SHALL render a `CnBrandBar` that places a block at the
start of `#header`, before Nextcloud's own content. The block SHALL be 237px
wide including a 1px by 28px divider at its end. The brand link SHALL have
padding 0 6px, radius 8px and 10px between the emblem and the text, and be at
least 48px high. The emblem SHALL be 34px high. The organisation (`caption`)
SHALL be 13px above the app name (`name`), which SHALL be 18px at weight 700.
The library SHALL add exactly one node of its own to the header and SHALL NOT
move, edit or remove a node Nextcloud drew. When Nextcloud re-renders the
header the library SHALL put its same node back and SHALL NOT add a second.
When `#header` is absent, or disappears, the bar SHALL NOT render and
`CnAppNav` SHALL draw the brand block. Without the board look, or without a
brand, `CnAppRoot` SHALL render exactly as before.

#### Scenario: An app without CnAppNav gets the block

- **GIVEN** an app under the board look that declares `nav.brand` with an emblem, a caption and a name and replaces the navigation through the `menu` slot
- **WHEN** it renders in a page with a Nextcloud header
- **THEN** the start of the header shows the 237px block with the emblem, the organisation and the app name

#### Scenario: Nextcloud re-renders its header

- **GIVEN** the block in the header
- **WHEN** Nextcloud replaces the header's children
- **THEN** exactly one block is in the header again, at its start

#### Scenario: No header

- **GIVEN** the board look and a page without `#header`
- **WHEN** the shell renders
- **THEN** the navigation draws the brand block and nothing else does

#### Scenario: Without the board look nothing moves

- **GIVEN** the same manifest without `look: "board"`
- **WHEN** it renders
- **THEN** the header is untouched and `CnAppNav` draws the brand block as before

@e2e include Measure the block width (237px) and emblem height (34px) in the header against dossiq/DqKop.

### Requirement: The navigation does not draw a brand block the header already draws

`CnAppNav` SHALL NOT render its brand block while `CnAppRoot` provides
`cnBrandInHeader` as true. The `brand` slot of `CnAppNav` SHALL still render
when the host fills it.

#### Scenario: One block, not two

- **GIVEN** the board look with a declared brand and the default placement
- **WHEN** the shell renders
- **THEN** exactly one brand block exists, in the header

### Requirement: An app can keep the brand block in the navigation

The manifest v2 schema SHALL accept `nav.brand.placement` as `"top-bar"` or
`"nav"`. Under the board look, `"nav"` SHALL keep the block in `CnAppNav` and
render no bar for it. Omitted, the placement SHALL be `"header"` under the
board look and `"nav"` otherwise.

#### Scenario: An app keeps the old position

- **GIVEN** the board look and `nav.brand.placement: "nav"`
- **WHEN** the shell renders
- **THEN** the header is untouched and the navigation draws the block
