# header-filter-contains Delta: cn-data-table

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-filter-contains](../../)

## Purpose

Let a text column's header filter find a partial, case-insensitive match
through OpenRegister's `[like]` operator.

## MODIFIED Requirements

### Requirement: A text header filter matches on contains

A text column's header filter SHALL send the trimmed term as
`{key}[like]` (one term as `{key}[like]=term`, several as
`{key}[like][]=a&{key}[like][]=b`), with the raw term URL-encoded and no
wildcards added by the library. An empty term SHALL clear the filter. The
panel SHALL label the box "Contains". The header filter SHALL read its state
from `{key}[like]` only, so an exact `key=value` filter set by the facet sidebar
or a fixed filter keeps its meaning and is not shown or cleared by the header.

#### Scenario: A partial name filters the list

- **GIVEN** a text column Title
- **WHEN** the person types " acme " in its header filter and applies
- **THEN** the table SHALL emit `column-filter` with `{ key: "title", params: { "title[like]": ["acme"] } }`
- **AND** the request SHALL carry `title%5Blike%5D=acme`

#### Scenario: Special characters reach the server raw

- **WHEN** the term is `50% off`
- **THEN** the request SHALL carry `title%5Blike%5D=50%25+off` and the library SHALL add no `%` of its own

#### Scenario: An exact sidebar filter is not the header's

- **GIVEN** the active filters hold `title: ["Acme"]` from the facet sidebar
- **THEN** the Title header filter SHALL show as inactive with an empty box
- **AND** clearing the header filter SHALL emit only `{ "title[like]": [] }`

#### Scenario: The panel says what it does

- **WHEN** the person opens a text column's filter
- **THEN** the box SHALL be labelled "Contains"
