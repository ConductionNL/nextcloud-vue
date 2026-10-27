# A record list tonal pill keeps its tint

## Why
r31 drew DqZaakGerelateerd "Vervolg plannen" grey (#f0f1f3) in the body ink, where the board draws it on the primary tint (#eaf0f7, #234a78). NcButton redefines the primary light colour inside the button, so the pill's own rule resolved to another colour.

## What changes
In the board look, the list reads the primary tint and ink into its own custom properties, and the tonal pill paints with them. Injected on :8080 the pill reads rgb(234, 240, 247) on rgb(35, 74, 120).
