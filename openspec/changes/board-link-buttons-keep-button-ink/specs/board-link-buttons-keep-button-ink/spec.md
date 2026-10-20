# board-link-buttons-keep-button-ink Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-link-buttons-keep-button-ink](../../)

## Purpose

A board button looks like a button whether it is a `<button>` or a link, and under any theme.

## ADDED Requirements

### Requirement: A board button that is a link keeps the button ink

In the board look a `.button-vue` rendered as `<a>` SHALL hand `--nldesign-color-on-surface` and
`--nldesign-component-link-color` its own ink and `--nldesign-component-link-text-decoration` the value `none`, and
SHALL draw no text decoration. A primary link button hands them the primary text colour. Breadcrumb buttons are not
affected.

#### Scenario: Documentatie on an admin settings page

- **GIVEN** the dossiq admin settings in the board look under the nldesign theme
- **THEN** "Documentatie" draws in the main text colour without an underline, like the board

### Requirement: A settings card's actions are neutral buttons

In the board look a secondary button in `.cn-settings-section__actions` SHALL draw the main text colour at 14px/600 on
the main background with a 1px `--cn-board-control-border` border, and hand the main ink to
`--nldesign-color-on-surface`.

#### Scenario: Checklist toevoegen on the VTH tab

- **GIVEN** the dossiq admin VTH tab in the board look
- **THEN** "Checklist toevoegen" draws as a neutral button with the main ink, not the primary tint
