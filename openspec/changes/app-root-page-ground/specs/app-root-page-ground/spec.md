# app-root-page-ground Delta: app-root-page-ground

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [app-root-page-ground](../../)

## Purpose

Let an app draw its pages on the page background instead of the content
panel, without app-side CSS overrides.

## ADDED Requirements

### Requirement: An app root can draw its content on the page ground

CnAppRoot SHALL take a `pageGround` prop (default `false`). When true, the
root's NcContent carries the class `cn-app-root--page-ground`, and neither
NcContent nor NcAppContent paints a background or a backdrop filter, so the
page background (Nextcloud's, or the theme's page ground) shows behind the
pages. Components inside the pages keep their own surfaces. When false, the
content panel renders exactly as before.

#### Scenario: Default

- **GIVEN** a root without `pageGround`
- **WHEN** the root renders its shell
- **THEN** NcContent does not carry `cn-app-root--page-ground`

#### Scenario: Page ground

- **GIVEN** a root with `pageGround`
- **WHEN** the root renders its shell
- **THEN** NcContent carries `cn-app-root--page-ground`
- **AND** the stylesheet makes `#content-vue` and `#app-content-vue` transparent under that class
