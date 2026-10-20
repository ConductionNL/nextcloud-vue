# board-ink-without-forcing Delta

## ADDED Requirements

### Requirement: A board rule sets its own ink

A board-look rule that names its text ink SHALL set it as `color`; it MAY also hand it to `--nldesign-color-on-surface`.

#### Scenario: A muted stage label under a theme

- **GIVEN** the board look and the nldesign theme
- **THEN** an open stage's label is drawn in `--color-text-maxcontrast`, not the body ink
