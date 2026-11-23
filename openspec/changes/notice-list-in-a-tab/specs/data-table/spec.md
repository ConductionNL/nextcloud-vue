# data-table Delta: notice-list-in-a-tab

## ADDED Requirements

### Requirement: A row icon can follow a field of the row

`rowIcon` SHALL also take an object `{ field, icons, tones?, icon? }`. Each row's leading icon SHALL be `icons[value]` for the row's value of `field`, else `icon`, else no glyph. Its tile tone SHALL be `tones[value]`, else `rowIconTone`. The board look SHALL draw a `warning` tile tone in the warning pill's colours. A string or function `rowIcon` SHALL behave as before.

#### Scenario: a warning notice leads with a warning tile
- GIVEN a list with `rowIcon` `{ field: "level", icons: { warning: "AlertOutline", info: "InformationOutline" }, tones: { warning: "warning" } }`
- WHEN a notice with level `warning` and one with level `info` are listed
- THEN the first row's tile shows the alert icon on the warning tone and the second the info icon on the primary tone

### Requirement: A secondary line names each value of a list field

A `secondary` template SHALL be read in the host's translation, as a column `template` is. A list value on a `secondary` line SHALL name each entry through the column's `secondaryLabels` for that field (an entry it does not name stays as stored), translated, and join them as a list in the page's language. Empty entries SHALL be left out.

#### Scenario: where a notice shows
- GIVEN a column with `secondary` "{level} · toont op {surfaces}" and labels for `site` (website) and `portal` (Mijn Zuiddrecht)
- WHEN a notice on `['site', 'portal']` is listed in Dutch
- THEN its line reads "Informatie · toont op website en Mijn Zuiddrecht"

### Requirement: A column can name its value by the row's fields

A column's `valueWhen` (`[{ when, value }]`, `when` a condition or a list of conditions in the `rowClass` grammar) SHALL give the cell the `value` of the first rule that holds on the row; the cell SHALL draw it as any value. With no rule holding the cell SHALL hold the stored value.

#### Scenario: a running notice reads as visible now
- GIVEN a status column with a rule `published` and `startsAt <= @now` and `endsAt >= @now` giving `visible`, and one `published` and `endsAt < @now` giving `expired`
- WHEN a running, an ended, an upcoming and a draft notice are listed
- THEN their cells hold `visible`, `expired`, `published` and `draft`
