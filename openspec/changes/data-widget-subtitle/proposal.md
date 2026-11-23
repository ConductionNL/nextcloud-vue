# A data card shows its subtitle

## Why

DqZaakContact's "Ontvangstbevestiging" card has a muted line under its title
("Awb 4:3a: de verzoeker hoort dat het verzoek binnen is"). The case page
declares it as the widget's `subtitle`, but a `data` widget (CnObjectDataWidget)
took only the title, so the line never showed (r26a: gapBelowTitle 13.8 vs 29).

## What changes

CnDetailWidgetHost passes a `data` widget's subtitle (the same `widgetSubtitle`
every other card gets) to CnObjectDataWidget, which hands it on to its card
(CnWidgetWrapper) as a fallthrough attribute.
