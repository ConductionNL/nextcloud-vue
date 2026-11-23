# A template can write a date in full

## Why

PqEvenement's header line reads "Donderdag 12 november 2026, 19:30 tot 21:30 · Wijkcentrum De Linde". The template formats only gave a short weekday ("do 12 nov") or a long date without the weekday ("12 november").

## What changes

- `{path|fulldate}` writes the weekday, the day, the month and the year in the user's language, with the first letter capitalised, because a line starts with it.
