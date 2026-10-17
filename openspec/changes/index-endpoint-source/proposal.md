# Proposal: index-endpoint-source

## Why

DqPostvak lists incoming messages that belong to no case yet. They come from dossiq's own endpoint, not from an
OpenRegister schema, so `type: "index"` had nothing to point at and the page would need a custom component.

## What changes

- A named index source `endpoint`: `entitySource: "endpoint"` with `sourceConfig: { url, rowsPath?, ... }`.
- `url` is an app path (`/apps/dossiq/api/postvak`), resolved with `generateUrl` and fetched with the reader's session,
  so the endpoint does its own authorization. `rowsPath` names where the rows sit (`results` by default; a bare array is
  taken as is).
- Every other `sourceConfig` key, the active quick filter's filter and the sidebar choices go along as query parameters,
  through the named-source load the page already has. The manifest declares the columns.
- A failed request leaves the list empty and is logged, as for the other named sources. No manifest schema change.

Note: CnPageRenderer fills `sourceConfig` with the whole page config when a page sets none, so an endpoint page sets
`sourceConfig` explicitly; without `sourceConfig.url` the source loads nothing.
