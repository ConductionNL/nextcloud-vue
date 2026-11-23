# widget-title-count Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A widget title can carry the total its widget reports

A dashboard widget title SHALL replace `{count}` with the `count` its widget reports in the `header` event, and the
card SHALL then draw no count chip. Before a count is reported the token SHALL read as nothing, with no double space
left behind. A stacked bar SHALL report the sum of its segments as `count` when its content sets `headerCount: true`,
once its counts have loaded and without an error.

#### Scenario: DqMijnWerk

- **GIVEN** the stacked bar "My {count} cases per step" (nl "Mijn {count} zaken per stap") with `headerCount: true`
- **WHEN** its segments count 3, 6, 3 and 2
- **THEN** the card title reads "Mijn 14 zaken per stap" and no chip follows it
