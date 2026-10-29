# A board file list's bar stands 16px above the list

## Why

DqZaakDocumenten and DqZaakDocumentenSlepen draw the files card as a column with 16px between its parts, so the buttons (Kolommen, Vraag een bestand, Nieuwe map, Bestanden toevoegen) stand 16px over the table. CnFilesBrowser stacks its parts 8px apart, so the table stood 7.2px high (r34).

## What changes

- Board look: the files bar gets 8px below it, which with the browser's 8px gap makes 16px.
