# transfer-card Delta: transfer-card

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [transfer-card](../../)

## Purpose

A user sees how far a long transfer is, what is in it, and can carry on after the connection dropped.

## ADDED Requirements

### Requirement: A card shows how far a transfer is

`CnTransferCard` SHALL show `done` against `total` in `unit` as words and as a progress bar named by those words. It SHALL read the words
from `amountTemplate` when given. The bar SHALL stay between 0 and 100, and at 0 with no total. Each of `items` SHALL show its label and its
state in words. With `paused` it SHALL say so in the `status` role, hide `remainingText`, and offer a Resume button that emits `resume`.

#### Scenario: Board DqInspectie "Dag synchroniseren"

- **GIVEN** `done` 32, `total` 48, `unit` "MB" and `amountTemplate` "{done} {unit} van {total} {unit} gedownload"
- **THEN** the card reads "32 MB van 48 MB gedownload" and the bar stands at 67

#### Scenario: The connection dropped

- **GIVEN** `paused`
- **THEN** the time left is gone and the card says the connection dropped
- **WHEN** the user presses Resume
- **THEN** the card emits `resume`

#### Scenario: No total yet

- **GIVEN** `total` 0
- **THEN** the bar stands at 0
