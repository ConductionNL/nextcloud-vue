# dashboard-phone Delta: screens-dashboard-phone

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dashboard-phone](../../)

## Purpose

Make a board-look dashboard page usable on a phone.

## ADDED Requirements

### Requirement: A board dashboard stacks on a phone

Under the board look, below 640px, the dashboard grid SHALL reflow to one column in reading order and the page SHALL
NOT scroll sideways. Without the board look the grid SHALL keep its fixed columns.

#### Scenario: 390px

- **GIVEN** a board dashboard with two widgets side by side on a desktop
- **WHEN** the window is 390px wide
- **THEN** the widgets sit one under the other, each at least 280px wide

### Requirement: Touch targets are at least 44px on a phone

Under the board look, below 640px, the compact segmented chips, the bar's switch and select, record-list rows, KPI
tiles and the widget Actions button SHALL be at least 44px high, and the chips SHALL wrap inside the bar.

#### Scenario: Chips

- **WHEN** the window is 390px wide and the chip group is wider than the screen
- **THEN** the chips wrap onto a second row and each is 44px high
