# Proposal: kb-search-titled-card

## Why

pl6 on :8080, PqKlant and PqOrganisatie "Kennisbank": the knowledge-base search in the client page's side column drew
as a bare field under the side cards, with no card and no "Kennisbank" title. The detail host only draws the titled
card for content-only types, and `kb-search` was not one.

## What changes

- `kb-search` joins the content-only types: on a detail card surface the host draws its titled card with the manifest
  title, like the other bare renderers. It has no Add.

## Reach

widgetDispatch.js only. Dashboards and the object sidebar render kb-search through their own hosts and do not change.
Only pipelinq's ClientDetail places kb-search on a detail page today.
