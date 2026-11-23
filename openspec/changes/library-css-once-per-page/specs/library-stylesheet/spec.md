# library-stylesheet Delta: library-css-once-per-page

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [library-css-once-per-page](../../)

## Purpose

Several apps' builds of the library on one page do not override each other's styles.

## ADDED Requirements

### Requirement: The library stylesheet is on a page once, the newest build winning

The published ESM entry SHALL install the library stylesheet as one `<style data-cn-library>` element per page. When
a build with a later build time installs, it SHALL replace that element's stylesheet; a build that is older or the
same SHALL leave it as it is.

#### Scenario: An older build loads after a newer one

- **GIVEN** a page where a newer build installed its stylesheet
- **WHEN** an older build's bundle runs
- **THEN** the page still holds one library stylesheet, the newer one

#### Scenario: A newer build loads after an older one

- **GIVEN** a page holding an older build's stylesheet
- **WHEN** a newer build's bundle runs
- **THEN** the page holds one library stylesheet, the newer one

### Requirement: Component scope ids follow the component's source

The published build SHALL scope a component's styles with an id derived from the component's path and source, so two
builds whose component differs never share a scoped selector.

#### Scenario: A changed component

- **GIVEN** two library builds in which CnObjectListWidget differs
- **WHEN** both are on one page
- **THEN** each build's CnObjectListWidget rules match only its own elements
