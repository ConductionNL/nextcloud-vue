# A data widget can read a date the board way

## Why
DqZaak "Zaakgegevens" draws its dates as "3 okt 2026". Live drew "12-10-2026, 09:12:00" and "12-10-2026", so r31 saw a different structure: the board's dates read as dates, live's as plain text.

## What changes
A data widget field override `format: 'date'` reads the board's short date ("3 okt", with the year outside this year), and `'date-long'` always adds the year, as the facts widget's formats of the same name do.
