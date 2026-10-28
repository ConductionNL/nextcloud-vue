# action-buttons Delta: action-error-outline

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-error-outline](../../)

## Purpose

Let a declared action be a red action that is not the main one, the way the boards draw a reversal.

## ADDED Requirements

### Requirement: An action can be an outlined red button

An action entry with `variant: "error-outline"` SHALL render as a secondary button with a red border and red text on the
main background, with its icon. `variant: "error"` SHALL stay the filled red button.

#### Scenario: Reverse a payment

- **GIVEN** a facts card with the action Reverse, `variant: "error-outline"` and the icon Undo
- **WHEN** the card is drawn
- **THEN** Reverse is a white button with a red border, red text and the Undo icon
