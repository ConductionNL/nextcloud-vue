# Proposal: files-browser-toolbar-actions

## Why

DqZaakDocumenten draws the files bar with two buttons: "Vraag een bestand aan een partij" and the primary "Bestanden
toevoegen". It draws no "Nieuw" menu. CnFilesBrowser already takes the host's bar buttons (`headerActions`), its New
menu entries (`newActions`) and a primary upload button (`uploadButton`), but always draws the New menu.

## What changes

CnFilesBrowser takes `newMenu` (default `true`); `false` leaves the New menu out. CnFilesTab forwards it. A host now
chooses each action's place: a button in the bar (`headerActions`), an entry in the New menu (`newActions`), the upload
as a button (`uploadButton`), and whether the New menu is there at all (`newMenu`).

## Scope

nextcloud-vue; dossiq moves "request-file" to `headerActions` and sets `newMenu: false` on the case Files tab
(R22-RECORD). Default behaviour is unchanged.
