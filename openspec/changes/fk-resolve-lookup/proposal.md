# fk-resolve-lookup

## Why

Learniq shows a pupil by name in 59 list columns through its own `learnerName` cell. The row holds the pupil's user
id and sometimes the uuid of their learner profile. The `fkResolve` cell could only read a record by its id and show
one field, so it could not find a profile by user id or build "Noor Bakker" from two fields. Humaniq employees and
dossiq requester names have the same need.

## What changes

- `matchField`: find the record whose property equals the value (`ncUserId`), one request per value per page.
- `refField` (CnCellRenderer): a row field holding the record's id, tried first; lists pair by position.
- `labelTemplate` and `labelPath`: build the label from the record or read it off a related object.
- A value looked up by `matchField` is not shown while the lookup runs, only when nothing answers.
