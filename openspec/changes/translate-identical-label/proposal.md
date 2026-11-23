# Proposal: translate-identical-label

## Why

The root's label lookup (`cnTranslate`) asks the app's translate first and,
when the answer reads the same as the text, the library's catalog. A
translation that is the same word in both languages looked untranslated:
pipelinq's nl "Open" -> "Open" (the lead status) came out as the library's
verb "Openen" on the PqLeads lens.

## What changes

- `createManifestTranslate` takes `hasTranslation(text)`. When the host's
  catalog holds the text, its answer stands, even when it equals the text,
  and the library catalog is not asked.
- `CnAppRoot` passes `appCatalogHas(appId, text)`, which reads the app's
  loaded catalog from Nextcloud's l10n registry.
