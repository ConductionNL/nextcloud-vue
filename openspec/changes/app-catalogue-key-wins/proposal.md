# Proposal: app-catalogue-key-wins

## Why

The root's `cnTranslate` asks the app first and falls back to the library catalogue when the app's answer equals the
text. An app word whose Dutch reads as the English then takes the library's meaning: pipelinq's lens "Open" (nl "Open",
the state) showed "Openen" (the library's verb) on board PqLeads.

## What changes

`createManifestTranslate` takes `hostHas(text)`. CnAppRoot answers it from the catalogue Nextcloud registers the app's
translations in. A key the app holds is the app's answer, even when it reads as the key; only a key the app lacks goes
to the library.
