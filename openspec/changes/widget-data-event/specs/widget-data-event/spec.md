## ADDED Requirements

### Requirement: A self-fetching widget tells its host what it shows

CnChartWidget and CnStatsBlockWidget SHALL emit `data` with a plain summary of what they show, once it is known and on
every change: a chart `{ series, categories, labels, total }` with `total` the sum of its first series, a count widget
`{ count }` for one source or `{ counts }` for entries. They SHALL emit nothing while there is no data.

#### Scenario: a donut of statuses
- **GIVEN** a donut over `aggregate: { groupBy: "status" }` whose groups are `new: 4` and `open: 9`
- **WHEN** the groups arrive
- **THEN** the chart emits `data` with `total: 13` and both categories

#### Scenario: a count tile
- **GIVEN** a count widget whose source answers 42
- **WHEN** the count arrives
- **THEN** the widget emits `data` with `{ count: 42 }`
