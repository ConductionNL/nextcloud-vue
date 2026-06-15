## MODIFIED Requirements

### Requirement: header actions slot

`CnWidgetWrapper` SHALL render an overflow `…` actions menu in its header containing at least the built-in **Refresh** and **Request a feature** entries. The menu SHALL be hidden when both built-ins are explicitly opted out AND no host `#header-actions` slot content is supplied.

When the host app does NOT bind a listener for `@refresh` or `@request-feature`, the action MUST still be functional via the built-in default handlers documented in the `widget-wrapper-actions` capability. The events SHALL still be emitted in both cases, so a host listener (when present) wins over the default and lets the host opt out per-event without disabling the menu.

The menu entries SHALL each carry a stable `data-testid` (`cn-widget-wrapper-action-refresh`, `cn-widget-wrapper-action-request-feature`) so consumer tests can target them.

#### Scenario: built-in actions render by default

- **GIVEN** `CnWidgetWrapper` is mounted with a widget body slot
- **AND** the host app binds no `@refresh` or `@request-feature` listener
- **WHEN** the user opens the `…` actions menu
- **THEN** both "Refresh" and "Request a feature" entries render
- **AND** clicking either triggers the built-in default handler (per `widget-wrapper-actions`)

#### Scenario: host listener overrides built-in default

- **GIVEN** the host binds `<CnWidgetWrapper @refresh="customHandler">`
- **WHEN** the user clicks Refresh
- **THEN** `customHandler` runs
- **AND** the built-in default (event-bus emit) does NOT also run

#### Scenario: opt out a single built-in

- **GIVEN** `CnWidgetWrapper` is mounted with `:show-refresh="false"` and no opt-out for Request a feature
- **WHEN** the user opens the actions menu
- **THEN** only "Request a feature" renders
- **AND** the menu still appears

#### Scenario: opt out everything

- **GIVEN** `CnWidgetWrapper` is mounted with `:show-refresh="false"` and `:show-request-feature="false"` and no `#header-actions` slot content
- **WHEN** the wrapper renders
- **THEN** the `…` actions menu does NOT appear
