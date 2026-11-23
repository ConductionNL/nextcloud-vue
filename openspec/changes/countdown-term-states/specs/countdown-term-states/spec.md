# countdown-term-states Delta: countdown-term-states

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [countdown-term-states](../../)

## Purpose

The countdown widget can draw the term card of board DqZaakTermijn in each of its states.

## ADDED Requirements

### Requirement: A term card reads per state

CnCountdownWidget SHALL resolve the state of its term: `overdue` once the date has passed, else `danger` or `warning`
by its thresholds, else `extended` when the property named by `extendedField` is truthy, else `onTrack`. A settled
record or an unset date SHALL have no state. `states` SHALL give each state an optional `headline`, `caption` and
`notice` `{ lead?, text?, type? }`, whose texts take `{date}` (the long date) and `{count}` (the days left, or the days
past once overdue) and run through the host's translate. The notice SHALL draw as a note card under the caption, in
its own `type` or the state's default: info on track and extended, warning at `warning`, error at `danger` and
`overdue`.

#### Scenario: Two weeks left

- **GIVEN** `thresholds: { warn: 14, danger: 7 }` and a `warning` notice "Let op de termijn"
- **AND** a case whose deadline is 14 days ahead
- **THEN** the card shows the notice "Let op de termijn" in the warning tone

#### Scenario: The term has passed

- **GIVEN** an `overdue` state with the headline "Termijn verlopen" and the caption "Beslisdatum was {date}, {count} dagen geleden"
- **AND** a case whose deadline was 3 days ago
- **THEN** the card reads "Termijn verlopen" and "Beslisdatum was" with the date and "3 dagen geleden"

#### Scenario: Already extended

- **GIVEN** `extendedField: "extendedOn"` and an `extended` notice "Verdagen kan één keer."
- **AND** a case 20 days from its deadline with `extendedOn` set
- **THEN** the card reads "20 dagen" and shows the notice in the info tone

### Requirement: An action can be greyed out per state

CnCountdownWidget SHALL draw every entry of `actions` as a button under the card, or `action` alone when `actions` is
absent. A button whose `disabledIn` names a state that holds SHALL be disabled with `aria-disabled="true"` and SHALL NOT
dispatch. `extended` SHALL hold for `disabledIn` whenever `extendedField` is truthy, also while a threshold or the date
decides the state. `disabledIn` SHALL NOT be sent with the dispatched action.

#### Scenario: Verdagen after the term has passed

- **GIVEN** `actions` "Verdagen" with `disabledIn: ["overdue", "extended"]` and "Termijn opschorten"
- **AND** a case whose deadline was 3 days ago
- **THEN** "Verdagen" is disabled and "Termijn opschorten" is not

#### Scenario: Extended and a week left

- **GIVEN** the same actions and a case 5 days from its deadline with `extendedOn` set
- **THEN** the danger notice shows and "Verdagen" stays disabled
