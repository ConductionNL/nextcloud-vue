# widget-registration Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [mail-widget-kept-in-dist](../../)

## ADDED Requirements

### Requirement: A widget registration survives tree shaking

Every module under `src/` that calls `registerDashboardWidget()` SHALL match a glob in the package's `sideEffects`
allowlist, so the build keeps it when the registrar imports it for its side effect only.

#### Scenario: The mail widget on a case page

- **GIVEN** an app bundling the published library and a case page with a `mail` widget in its Email tab
- **WHEN** the tab opens
- **THEN** the mail widget draws its header actions and template row

#### Scenario: A new registration in a module the allowlist drops

- **GIVEN** a new widget registered from a module whose path matches no `sideEffects` glob
- **THEN** the packaging test fails and names that module
