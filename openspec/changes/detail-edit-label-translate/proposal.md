# Proposal: detail-edit-label-translate

## Why

CnDetailPage rendered `config.editLabel` as written, so dossiq's "Deviate with a reason" showed in English on a Dutch
page (DqHandhaving), while every other manifest label goes through the host translate.

## What changes

- `editLabel` is run through the host translate (`cnTranslate` / `translate`). Without it the library's translated
  "Edit" stays.
