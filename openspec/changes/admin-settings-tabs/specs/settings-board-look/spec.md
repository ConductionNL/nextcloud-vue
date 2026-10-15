# settings-board-look Delta: admin-settings-tabs

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-settings-tabs](../../)

## Purpose

An admin settings page can split its sections over tabs under the header, as the admin boards do.

## ADDED Requirements

### Requirement: The admin shell can draw a tab strip

`CnAdminSettingsShell` SHALL accept `tabs` as `[{ id, label, count? }]` and, when it holds at least one tab, SHALL draw a tab strip directly under the header with one tab per entry and its count after the label. The panel of a tab SHALL be the app's `tab-<id>` slot. The version card, the credential broker and the default slot SHALL show only while the first tab is open. The open tab SHALL be the one the address names in the `tabQueryKey` query parameter (default `tab`), else the first. Opening a tab SHALL write its id to that parameter without adding a history entry and SHALL emit `tab-change` with the id. The strip SHALL follow the WAI-ARIA tabs pattern, with the arrow keys, Home and End moving between tabs. Under the board look a panel's settings sections SHALL be cards on the shell's grid. Without `tabs` the shell SHALL render as before.

#### Scenario: Shillinq settings with three tabs

- **GIVEN** a shell with tabs Algemeen, Verplichte velden (12) and Koppelingen (5)
- **THEN** the strip under the header reads "Algemeen", "Verplichte velden 12" and "Koppelingen 5", with Algemeen open and the version card shown
- **WHEN** the reader presses ArrowRight on the open tab
- **THEN** Verplichte velden is open and focused, the address reads `?tab=velden`, and the version card is gone

#### Scenario: A link to a tab

- **GIVEN** the address `/settings/admin/shillinq?tab=velden`
- **WHEN** the page loads
- **THEN** Verplichte velden is the open tab
