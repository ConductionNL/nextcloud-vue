## ADDED Requirements

### Requirement: A page, widget or action can follow a feature toggle

A manifest entry with `visibleIf.feature` or `visibleWhen.feature` SHALL show only while that toggle is on. A toggle
SHALL read the server's merged value, else its declared default; when the server served no map it SHALL read its
`failMode` (`open` on, `closed` off), else its default. An undeclared toggle SHALL read off.

#### Scenario: payroll switched off
- **GIVEN** a declared toggle `payroll` and the server's map `{ payroll: false }`
- **THEN** the Payroll menu entry and every widget or action with `feature: "payroll"` are hidden
