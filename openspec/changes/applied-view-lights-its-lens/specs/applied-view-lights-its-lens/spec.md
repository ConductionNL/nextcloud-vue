## ADDED Requirements

### Requirement: An applied view lights its lens and names its conditions

While a saved view is applied, an index page SHALL light the most specific non-default lens chip whose conditions the
view holds, until the reader picks a chip, and SHALL use `savedViewCountText` as its count line with `{view}` filled by
the view's description or its filters in words.

#### Scenario: Termijn deze week
- GIVEN Pieter's view with handler @me and a deadline from today to today + 7 days, and lenses Mine and Due this week
- THEN the "Due this week" chip is lit
- AND with savedViewCountText "{shown} of {total} open cases · {view} · sorted by deadline" the line names the view's description

#### Scenario: No fitting lens
- GIVEN a view filtering only on team
- THEN the active chip stays as it was
