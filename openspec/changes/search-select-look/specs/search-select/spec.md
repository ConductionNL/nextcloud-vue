# search-select Delta: search-select-look

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [search-select-look](../../)

## Purpose

Draw a single picker as a search field with rich result rows.

## ADDED Requirements

### Requirement: A single picker can take the search look

CnSearchSelect SHALL draw a single select with a magnifier in place of the chevron, and each option as a row of an icon (`icon`) or the label's initials (`avatar: true`), the label, an optional `secondary` line, and a check on the chosen option. It SHALL emit the picked option's id, or null when cleared, and pass the typed text on as `search`. CnFormDialog SHALL draw a single select field (not a Nextcloud-user field) with it when the field has `look: "search"`, filling each row's secondary line from the field's `optionSecondary` template unless the option carries its own.

#### Scenario: Nieuw team

- **GIVEN** a handover form whose team field has `look: "search"`, `optionAvatar: true` and `optionSecondary: "{members} leden · {focus}"`
- **WHEN** the reader opens the field
- **THEN** it shows a magnifier and no chevron, each team as initials, name and "6 leden · bezwaar, beroep en Woo-advies", and the chosen team carries a check
