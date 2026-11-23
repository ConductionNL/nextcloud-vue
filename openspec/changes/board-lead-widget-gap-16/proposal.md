# A lead widget stands 16px above the card's body

## Why

DqZaakDocumenten draws the review summary, then 16px, then the files toolbar and table. Live, the summary (a lead widget in the files card) sits flush on the files browser (r29: Documenten card 12.7 short under the title, the toolbar at 173.3 right under the summary's bottom; read on :8080).

## What changes

- Board look: `.cn-detail-widget-host__lead` has a 16px bottom margin.
