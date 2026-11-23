# dashboard-page Delta: dashboard-greeting-label

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-greeting-label](../../)

## Purpose

Let a dashboard subtitle lead with a label or with the date instead of a greeting.

## ADDED Requirements

### Requirement: The header subtitle can lead with a label or the date

With `greeting: { label }` CnDashboardPage SHALL render the subtitle as the label through the host translate function,
today's date written out in the user's locale and the translated description when set, joined by " · ". With
`greeting: "date"` it SHALL lead with the date, its first letter upper case, followed by the description. A label
object with an empty label SHALL leave the description alone, as without `greeting`.

#### Scenario: A label in place of the greeting

- **GIVEN** `greeting: { label: "Customer contact" }`, a translation "Klantcontact" and the description "available for calls"
- **WHEN** the page renders
- **THEN** the subtitle reads "Klantcontact · <date> · available for calls" and holds no greeting

#### Scenario: The date alone

- **GIVEN** `greeting: "date"` and the description "nine items are with you"
- **WHEN** the page renders
- **THEN** the subtitle starts with the capitalised date and ends with " · nine items are with you"
