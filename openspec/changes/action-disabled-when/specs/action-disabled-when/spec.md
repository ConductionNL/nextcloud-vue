## ADDED Requirements

### Requirement: An action can be disabled with the reason why

An action with `disabledWhen` SHALL be drawn disabled while that condition holds, SHALL show its `disabledReason`, and
SHALL NOT run while disabled. When the condition does not hold the action SHALL work as before.

#### Scenario: a dormant payment adapter
- **GIVEN** Send payment link with `disabledWhen` on the adapter being inactive
- **WHEN** the adapter is inactive
- **THEN** the button is disabled and its tooltip says the payment provider is not connected
