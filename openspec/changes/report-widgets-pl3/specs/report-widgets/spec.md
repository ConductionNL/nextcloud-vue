# report-widgets Delta: report-widgets-pl3

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [report-widgets-pl3](../../)

## ADDED Requirements

### Requirement: A row action reads its row

A table's row action SHALL fill `@row.<field>` (dot paths allowed) in its url, filename, target, payload, params and
props from the row it runs on before it is dispatched. A token that is the whole value SHALL keep the field's type.

#### Scenario: Run one watch

- GIVEN a row `{ id: 'w-7' }` and an api-call action on `/competitor-watches/@row.id/run`
- WHEN the action runs on that row
- THEN it SHALL post to `/competitor-watches/w-7/run`

### Requirement: A table on an endpoint sorts by header

A sortable header of a table whose rows come from an endpoint SHALL sort those rows: numbers as numbers, text in the
reader's collation, empty values last. Before a header is clicked and after the sort is cleared the endpoint's order
SHALL hold.

#### Scenario: Handling time sorts as a number

- GIVEN rows with 540, 600 and 90 seconds
- WHEN the reader sorts the column descending
- THEN the rows SHALL read 600, 540, 90

### Requirement: A stat tile's note carries figures from the answer

A stat tile's `note` SHALL fill `{path}` placeholders from the endpoint answer after it is translated, as its caption
does.

### Requirement: Markdown and image widgets show a field of the record

On a detail page `content.field` SHALL name the field of the record the markdown widget renders, or the image widget
shows (`altField` its text). An image field value that is a Files path SHALL be shown through Nextcloud's preview.
