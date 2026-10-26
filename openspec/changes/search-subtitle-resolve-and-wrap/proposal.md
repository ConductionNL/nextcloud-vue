# Proposal: search-subtitle-resolve-and-wrap

## Why

DqZoekresultaten r29: the board draws "Zaak 2026-0110 · Woo-verzoek" under a case and wraps long titles (row 100 vs 65 on :8080, where the title was cut and the case type missing).

## What changes

- A search kind may set `subtitleResolve` (`{ field, schema, register?, labelField?, as }`): the referenced object is named by its label for the subtitle template as `{as}`.
- `sourceConfig.titleWrap` wraps the Result column (`cn-cell--wrap`).
