## ADDED Requirements

### Requirement: A dashboard can weigh its column groups

With `gridColumnWeights: [{ span, weight }]` on the page, or on the `layoutWhen` entry that draws the page now, the dashboard grid SHALL give each group of `span` columns its `weight`'s share of the width, split evenly over its columns, and SHALL place every layout entry by the columns it spans. The spans SHALL add up to 12 and every weight SHALL be positive; otherwise, without it, on a grid narrower than twelve columns and while the layout is edited, the grid SHALL keep twelve equal shares. An entry on a `gridSideColumn` track SHALL keep the side column.

#### Scenario: PqWerkplekKlant in a call
- **GIVEN** the in-call `layoutWhen` entry with `gridColumnWeights: [{ span: 4, weight: 352 }, { span: 4, weight: 435 }, { span: 4, weight: 352 }]` on a 1140px grid with 10px item margins
- **THEN** the cards at columns 0 to 4 are 332px wide, those at 4 to 8 are 415px from x 644, those at 8 to 12 are 332px from x 1080
- **AND** the action row across all twelve columns keeps the full width

#### Scenario: The same page outside a call
- **GIVEN** the page's own layout and no page `gridColumnWeights`
- **THEN** its cards keep the twelve shares

#### Scenario: Dossiq dashboards
- **GIVEN** a dossiq dashboard, which sets no `gridColumnWeights`
- **THEN** its cards do not move
