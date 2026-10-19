---
kind: code
---

# Proposal: nc-widget-exclude-apps

## Summary

Board DqMijnWerk draws "Recente activiteit" from Nextcloud's activity widget, without the noise of system-tag assignments. A Nextcloud widget placed with `nc-widget` showed every item. `content.excludeApps` and `content.excludeTypes` leave out the items of those apps or types; the list then comes from the items API, asked for more items so a `limit` still fills.

## Scope

- `src/components/CnNcWidgetWidget/CnNcWidgetWidget.vue`.
- Manifest: `excludeApps` and `excludeTypes` are new `nc-widget` content keys; the batch integration adds them to the schema.
