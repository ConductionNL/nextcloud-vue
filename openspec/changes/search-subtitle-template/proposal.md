# Proposal: search-subtitle-template

## Why

DqZoekresultaten draws the line under a result as "Zaak 2026-0082 · Woo-verzoek" and "Object · Lindelaan 40". The
search source could only show one field (`subtitleField`), so :8080 read a bare "2026-0042".

## What changes

A search kind may declare `subtitleTemplate`, translated and filled from the found object like `linkedTemplate`; it wins
over `subtitleField`. No schema change (the search kinds are free-form source config).
