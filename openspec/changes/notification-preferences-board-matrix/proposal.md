# Proposal: notification-preferences-board-matrix

## Why

pl2 PqPersoonlijk "Meldingen": the board draws the notification events as a matrix (Melding / In Nextcloud / Per e-mail), as DqPersoonlijkeInstellingen does; CnAppRoot's default notifications section (CnNotificationPreferences) drew switch tiles per schema, so every app without a screen of its own (pipelinq) read "missing table / extra cards" (16 items).

## What changes

- In the board look CnNotificationPreferences draws CnNotificationMatrix from the same OpenRegister answer, one column per channel the platform declares, and writes a cell as the row's channels.
- The mapping (`propsFor`, `writeFor`, ...) moves into the library (`src/utils/notificationPreferenceProps.js`), as dossiq wrote it for its own screen.
