# Proposal: settings-fields-four-columns-and-note

## Why

DqInstellingenAlgemeen draws "Huisstijl" with its four fields in one row (organisation, city, app name, theme);
CnSettingsFieldsSection lays out one to three columns. "Teksten en toegang" names "Toegestane websites (CORS)" as a
label with a muted line under it, a setting kept in another app; a read-only text input is the only way to say that
today, which reads as a field you cannot type in.

## What changes

- `columns` takes 4: two columns from 520px, three from 780px, four from 960px of card width.
- A field `type: "note"` draws its label and `text` as a muted line, holds no value and is never read, dirty or saved.

## Scope

CnSettingsFieldsSection, CnSettingsField. No schema change.
