# Design: screens-table-footer-and-system-dates-parity

## The count

CnPagination already calls `t('nextcloud-vue', '{shown} of {total}')` for the
board footer and `t('nextcloud-vue', '{from}–{to} of {total}')` for the
compact info. The strings are missing from `l10n/*.json`, so Nextcloud shows
the source text. Adding them to `en.json` and `nl.json` (the catalogues kept
by hand) is the fix; other languages fall back to English as before.

CnIndexPage's board count line used `cnTranslate(countText || countSubtitle
|| '{shown} of {total}')`. `cnTranslate` is the app's manifest label lookup,
so the default never reached the library catalogue. Without a page template
it now calls the library's `t()` with `{ shown, total }`; a page template
still goes through `cnTranslate`.

## System dates

`getCellValue` already reads dotted paths, so `@self.created` returns
`row['@self'].created`. What is missing is the type: `columnProperty` hands
CnCellRenderer `{}` for a key with no schema property, which renders plain
text. A fixed list of the `@self` date keys returns
`{ type: 'string', format: 'date-time' }` instead, which CnCellRenderer draws
as a date (NcDateTime). A column's own `type` or `format` wins. Sorting is
unchanged: a column without a schema property sorts only with an explicit
`sortable: true`.
