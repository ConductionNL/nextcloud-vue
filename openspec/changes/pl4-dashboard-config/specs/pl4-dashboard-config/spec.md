# pl4-dashboard-config Delta: pl4-dashboard-config

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-dashboard-config](../../)

## Purpose

A dashboard widget can name an app setting.

## ADDED Requirements

### Requirement: A dashboard widget can name an app setting

CnDashboardPage SHALL read its app config from the `cnAppConfig` an ancestor provides, with its own `appConfig`
winning key by key. A registry widget's `content` SHALL have each `@config.<key>` string filled from that config at
any depth; an unset optional token (`@config.<key>?`) SHALL become empty and an unset required one SHALL stay as
written. Content without a token SHALL reach the widget as the same object.

#### Scenario: A knowledge base scoped to the admin's space

- **GIVEN** the app root provides `{ xwiki_default_space: "Support" }` and a widget `{ type: "kb-search", content: { space: "@config.xwiki_default_space?" } }`
- **THEN** the widget searches the Support space
