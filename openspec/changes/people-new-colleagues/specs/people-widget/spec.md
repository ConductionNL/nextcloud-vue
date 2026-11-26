# people-widget: delta for people-new-colleagues

## ADDED Requirements

### Requirement: The people widget lists new colleagues

The people widget form MUST offer the selection New colleagues only when the people source reports a start date field (`hasStartDateField()` resolves true) or the placement already uses it, with the windows `newSinceDays` (1 to 90, default 30) and `newUntilDays` (0 to 30, default 14); a window out of range MUST keep the form invalid. With `selectionMode: 'new'` the widget MUST list the people the source's `fetchNewPeople` returns, in its order, with role and team, and MUST mark a person who has not started yet with the weekday of their start ("Starts Monday", nl "begint maandag"). When the source answers `configured: false` the widget MUST say the administrator has not set a start date field.

#### Scenario: a colleague starts next Monday

- GIVEN the source lists Yasmina, starting Monday 12 October, and Lotte, who started on 1 October
- WHEN the widget with `selectionMode: 'new'` renders
- THEN Yasmina shows with her role, her team and "Starts Monday"
- AND Lotte shows without a start mark

#### Scenario: no start date field

- GIVEN the source reports no start date field
- WHEN an author opens the people widget form
- THEN the form offers no New colleagues
