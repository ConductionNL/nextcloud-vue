---
kind: code
---

# Proposal: screens-relative-dates

## Summary

The boards PtToegangsverzoeken, PtInzendingen and DqMijnWerk write a moment as
"vandaag, 09.42", "gisteren, 23.12" and, from the day before, a short date
("29 sep"). A manifest had the board short date ("5 okt") and the age ("3
dagen"), but nothing that says "today" and "yesterday".

## What changes

1. A date helper `formatRelativeDate(value, { withTime, now })`: today and
   yesterday (tomorrow, for a due date) as words, otherwise the board short
   date; with `withTime` the time of day follows ("vandaag, 09.42"). Words and
   months follow the Nextcloud user language through the library catalogue;
   the time separator is one translatable string (Dutch "09.42", English
   "09:42").
2. Three ways to use it, all config:
   - a column `widget: "date"` with `widgetProps: { relative: true, showTime: true }`;
   - the template tokens `{path|relative}` and `{path|relativetime}` in record-list
     `title`, `meta` and the other templates that use `fillTemplate`;
   - the built-in `relativeDate` formatter (`formatterOptions: { time: true }`).

Column and widget props are open objects in the manifest schema, so the schema
does not change and needs no version. Without the new keys nothing changes.
