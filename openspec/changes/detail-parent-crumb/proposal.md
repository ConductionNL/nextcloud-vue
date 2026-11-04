# Proposal: detail-parent-crumb

## Why

A sub-record sits under another record of the same kind: a sub-case under its case. Its page should say so in the
trail, "Cases / Z-2026-001 / Z-2026-001-1", with a link back to the parent. A record page's breadcrumb only names fixed
crumbs from the manifest, so the parent is lost.

## What changes

- A crumb of `breadcrumb` may carry `parent` instead of `label`: the name of a `visibilityContext` entry, which the page
  already reads beside the loaded record.
- The crumb shows the parent's `labelField` value, else its name or title, else the crumb's `label`, and links to
  `route` with the parent's id in `param` (default `id`), or to `href` with `{id}` filled in.
- A record without a parent drops the crumb; a trail with no crumb left before the record draws nothing.

No schema change: the page config is open. Existing crumbs work as before.
