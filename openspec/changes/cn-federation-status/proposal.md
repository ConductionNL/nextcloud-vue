# CnFederationStatus — federated-directory status widget

## Why

The opencatalogi triage flagged `DirectoryIndexView` as a custom because no lib widget renders federation-node availability (status dots, counts, per-node URLs). The shape recurs across consuming apps that surface multi-tenant / multi-node systems.

## What

`src/components/CnFederationStatus/CnFederationStatus.vue` (~300 LOC). Aggregate summary (counts per `up`/`degraded`/`down`/`unknown`) + per-node list. Status strings are normalised (`up`/`online`/`ok` → `up`, etc.) so consumers ship without an exhaustive enum. `@node-click` emits the raw node object for drilldown. Sort by `status` (default), `name`, or `none`.

## Non-goals

- Polling logic — consumers fetch + push the node array.
- Per-node history charts (CnRelationshipGraph / time-series widget = separate scope).
- Cross-node action triggering — that lives on a parent screen, not the status widget.

## References

- [nextcloud-vue#288](https://codeberg.org/Conduction/nextcloud-vue/issues/288).
- opencatalogi `DirectoryIndexView` (PR #636).
