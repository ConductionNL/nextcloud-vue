# reveal-field Delta: reveal-field

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [reveal-field](../../)

## Purpose

A protected value, such as a citizen service number, stays masked until the user asks to see it, and every viewing
goes through the host so it can be logged.

## ADDED Requirements

### Requirement: A protected value shows only on request

`CnRevealField` SHALL show its `label`, its `maskedValue` and a button "Show" whose accessible name is "Show {label}".
On Show it SHALL call `load(reason)` and show the value it answers, the button then reading "Hide" ("Hide {label}").
Hide SHALL mask the value again and drop it, and the next Show SHALL call `load` again. With `requireReason` Show SHALL
first ask why, keep its confirm button disabled while the reason is empty, and pass the trimmed reason to `load`;
cancelling SHALL fetch nothing. A rejected or empty answer SHALL keep the value masked and show an error with the
`alert` role. The component SHALL emit `revealed` with `{ reason }` once the value shows, and `hidden` when it is masked
again. `note` SHALL draw as a line under the value.

#### Scenario: Board DqContact "BSN"

- **GIVEN** `label` "BSN", `maskedValue` "*****4001" and `note` "Het tonen van het BSN wordt gelogd."
- **THEN** the field reads "BSN *****4001" with a button named "Show BSN" and the note under it
- **WHEN** the user presses Show
- **THEN** `load` is called and the field reads the value it answers

#### Scenario: A reason first

- **GIVEN** `requireReason`
- **WHEN** the user presses Show
- **THEN** a reason field opens and `load` is not called yet
- **WHEN** the user types "Identificatie bij het loket" and confirms
- **THEN** `load` is called with "Identificatie bij het loket"

#### Scenario: The server refuses

- **GIVEN** `load` rejects
- **WHEN** the user presses Show
- **THEN** the value stays masked and an error says it could not be shown
