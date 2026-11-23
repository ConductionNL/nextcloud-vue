# index-page Delta: named-source-header-filters

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [named-source-header-filters](../../)

## ADDED Requirements

### Requirement: A named source can filter from its column headers through its search fields

A named source that declares `headerFilters: "searchFields"` SHALL give a column a header filter exactly when the field
the column filters on (`filterField`, else its key) is a search field the page declares in `sidebar.fields`. The
filter's control SHALL follow that field: a choice list for an enum (with its labels), a from-to date for a date, a
search over the `optionsSource` objects for a reference. A header choice SHALL set the same active filter the sidebar
sets for that field, a date range as one `{ from, to }` value. A header filter SHALL show as active while that filter
is set, including a default filter. A column without a declared search field SHALL draw no header filter.

#### Scenario: DqTaken

- **GIVEN** the Tasks list with the sidebar fields `objectUuid`, `state`, `priority`, `kind`, `dueAt` and the default
  filter `dueAt: { from: @monthStart, to: @monthEnd }`
- **THEN** the Onderwerp, Status, Prioriteit and Deadline headers carry a funnel, the Deadline one active, and Taak and
  Behandelaar carry none
- **WHEN** the reader picks "In uitvoering" in the Status funnel
- **THEN** the inbox is asked again with `state=active`, and the chip "Status: In uitvoering" appears

#### Scenario: Handler

- **GIVEN** that the inbox has no assignee predicate
- **THEN** the Behandelaar header carries no funnel (it lands when OpenRegister grows the parameter)
