# A search index status panel

## Why

Apps that search OpenRegister objects show the state of its search indexes on
their admin page. The indexes are OpenRegister's; every app read and drew the
same figures.

## What changes

- New `CnSearchIndexStatus`, reading `/apps/openregister/api/settings/search-index`.
