# Proposal: header-meta-when

## Why

Board PqOfferte's header line reads "nog niet verstuurd · prijzen excl. btw" on a draft quote. Once sent, the line
should name when it went out. `headerMeta` is one template; an empty token drops itself, but a template cannot say
something only while a field is empty or while the record is in a given state.

## What changes

- `config.headerMetaWhen`: `[{ when, text }]`, a local `visibleWhen` condition on the record and a template. The first
  entry whose condition holds replaces `headerMeta`; when none holds `headerMeta` stays.

Without the key nothing changes. No schema change (the page config is open).
