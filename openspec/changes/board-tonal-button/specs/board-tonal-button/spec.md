# board-tonal-button Delta: board-tonal-button

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tonal-button](../../)

## Purpose

Let any action on a card be the boards' light-blue pill, from one shared style.

## ADDED Requirements

### Requirement: Any button can be the board's tonal pill

A button carrying `cn-button--tonal` SHALL be drawn 34px high, 12px in, without a border, with a 17px radius, on the
primary tint with its ink at 13px weight 600, in the board look above its neutral button looks. An action entry with
`variant: "tonal"` SHALL render as a tertiary button carrying that class.

#### Scenario: A reminder action on a side card

- **GIVEN** a booking page whose side card shows the action Send reminder with `cn-button--tonal`
- **WHEN** the page is drawn in the board look
- **THEN** Send reminder is a 34px light-blue pill with a 17px radius, no border and dark-blue text

#### Scenario: A declared tonal action

- **GIVEN** an actions bar with the entry Export, `variant: "tonal"`
- **WHEN** the bar is drawn
- **THEN** Export is a tertiary button carrying `cn-button--tonal`
