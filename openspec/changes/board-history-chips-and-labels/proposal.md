# The history card's chips and composer labels as drawn

## Why
r30 measured DqZaakHistorie "Historie van de zaak" and "Notitie toevoegen" 3.2px low. The kind chips are plain buttons, so the server's `margin: 3px 3px 3px 0` moved them 3px down. The composer labels ran on a 21px line where the board draws 17.

## What changes
In the board look the chips carry no margin and the composer labels sit on a 1.2 line. No markup change, no schema change.
