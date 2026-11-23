# A facts entry can write a moment as today's time or its date

## Why
Board PqWerkplekKlant reads "Bron: BRP, opgezocht 10:24, vastgelegd": a lookup made today is named by its time. The facts card could only write dates.

## What changes
The format `today-time` writes a moment from today as "HH:MM" and a moment on another day as its board date. It works on a field and inside a template (`{at:today-time}`).
