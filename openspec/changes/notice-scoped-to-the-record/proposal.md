# Proposal: notice-scoped-to-the-record

## Why

DqZaak draws a side notice on a case while advice is still asked on it: "Advies gevraagd aan Mobiliteit en verkeer.
Antwoord uiterlijk 10 oktober. Afronden kan pas daarna." The banner widget already shows a notice when an OpenRegister
query matches (`visibleWhen.source`) and names its first row (`{subject.<field>}`), but on a record's page it could
not scope that query to the record: the `@objectId` token in its filter was never resolved. And with a count condition
(`@total`) it did not keep the first row, so the text could not name it.

## What changes

On a detail page the banner reads the page's record context (`cnObjectContext`), so `@objectId` and `@object.<field>`
in a `visibleWhen.source` filter resolve to the record, and it asks again once the record is known. A source condition
on the count keeps the first row as the subject as well.
