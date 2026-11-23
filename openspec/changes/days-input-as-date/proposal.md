# A days input can be set as a date

## Why
DqVolgendeStap draws "De zaak komt terug op (niet verplicht)" as a date field under "Dagen die de aanvrager krijgt",
prefilled from the days. Live drew it as a line of text worked out from the days (`preview`). The coordinator ruled on
24 Oct that the field is built: the act's API keeps taking days, and the days follow from the chosen date.

## What changes
A transition input may declare `dateField: { label, note, testid }` on a days input. Under the input it draws an editable
date. The date's value is today plus the days (`dateValue`, `dayAfterIso`). A chosen date sets the days to the whole
days from today, at least 1 (`daysUntilIso`). The date is never required, and it carries the optional marker when the
form marks optional inputs. No schema change.
