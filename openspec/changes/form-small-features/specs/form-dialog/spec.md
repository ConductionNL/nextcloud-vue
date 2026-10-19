# form-dialog Delta: form-small-features

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A field can warn without blocking the save

A field with `warnWhen` SHALL show its text under the field while its condition holds, and SHALL NOT block the save. A field with `requiredWhen` SHALL be required while its condition holds.

#### Scenario: A scheme and choices both set

- **GIVEN** a property with a concept scheme and choices
- **WHEN** the form opens
- **THEN** a note under the choices says the scheme wins, and the form saves

### Requirement: A section can be folded

A section with `sectionCollapsed` on one of its fields SHALL fold and unfold from its heading, a button with `aria-expanded`, opening folded when the value is `true`.

#### Scenario: More options

- **GIVEN** `defaultValue` in the section "More options" with `sectionCollapsed: true`
- **WHEN** the form opens
- **THEN** the heading shows folded, and activating it shows the field

### Requirement: A list of strings is edited one per line

A field with `widget: 'lines'` SHALL edit a list of strings as text with one per line, trimming each line and dropping the empty ones.

#### Scenario: Choices

- **WHEN** the reader types " a ", "" and "b" on three lines
- **THEN** the field holds `['a', 'b']`

### Requirement: An option can show a colour or an icon

A select with `optionSwatches` or `optionIcons` SHALL draw the colour or icon of an option's value before its label, in the list and in the chosen value.

#### Scenario: Status colour

- **GIVEN** `optionSwatches: { grey: '#888' }`
- **THEN** the option grey shows a grey dot
