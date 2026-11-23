# board-control-border Delta

## ADDED Requirements

### Requirement: A board control border is 3:1 on every ground

In the board look a control's edge SHALL be drawn in `--cn-board-control-border`, which SHALL default to Nextcloud's
max-contrast border, so it is at least 3:1 against the grounds a control sits on (WCAG 1.4.11).

#### Scenario: A header button under plain Nextcloud

- **GIVEN** the board look and Nextcloud's own theme
- **THEN** a secondary header button's border is `--color-border-maxcontrast`, not the #dbdbdb hairline
