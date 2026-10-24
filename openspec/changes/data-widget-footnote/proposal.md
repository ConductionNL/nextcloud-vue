# A data card can end with a footnote

## Why

DqZaakContact's "Ontvangstbevestiging" card ends with a muted line: "Ging de
bevestiging buiten dossiq om, dan legt u hem vast met Ontvangst bevestigd
vastleggen, onder Meer." The card is a `data` widget (CnObjectDataWidget),
which had no footnote, while the record list, object list and sections
widgets already have one.

## What changes

CnObjectDataWidget `footnote`: a muted 13px line under the fields, through the
host translate. CnDetailWidgetHost passes a `data` widget's `content.footnote`.
