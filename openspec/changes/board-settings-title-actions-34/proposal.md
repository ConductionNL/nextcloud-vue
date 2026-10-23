# A settings card's title-row actions are 34px

## Why

The boards draw the actions in a settings card's title row at 34px, for
example DqVthInstellingen "Regel toevoegen", "Activiteit koppelen" and
"Checklist toevoegen", and DqInstellingenAlgemeen "Dag toevoegen". Batch 24t1
made every labelled button on a settings card 40px, which is right for the
body buttons ("Opslaan", "Verbinding testen"). It also caught the title row,
and COMPDIFF r24 recorded those buttons as `h 34>40`.

## What changes

The 40px rule now leaves `.cn-settings-section__actions` alone, so the title
row keeps NcButton's 34px. A live probe on :8080 confirmed that these buttons
sit in `.cn-settings-section__actions`.

An image field's button keeps 34px too. DqInstellingenAlgemeen draws
"Ander logo" beside the logo at 34px. A probe on :8080 found it in
`.cn-settings-field__image-row`, which the 40px rule now also leaves alone.
