---
kind: code
---

# Proposal: cnindexpage-folder-schema

## Summary

Let a `folderSidebar` folder switch which register and schema `CnIndexPage`
lists, not only filter the schema it already has. Today a folder narrows the
page's one schema by a field value; it cannot point the page at a different
schema.

Split out of dossiq's `contacts-domain` change (task 2.2) on Ruben's
2026-09-11 decision: the seam belongs here, because it changes how every
index page in the fleet resolves its list, not only dossiq's Contacts page.

## Motivation

dossiq wants one Contacts page whose sidebar carries a People folder over
`brpPerson` and an Organisations folder over `kvkCompany`, two different
schemas in the same register. `contacts-domain` measured this against the
shipped component three times (nextcloud-vue 2.41.0, 2.42.0, and
`development` ahead of 2.47.0) and stayed blocked on the same two facts each
time:

- `folderSidebarFolders()` hands a `source: custom` folder's `folders[]`
  array straight to `CnFolderTree` (`src/components/CnIndexPage/CnIndexPage.vue`).
  A folder's `schema` key, if one were added to the manifest today, reaches
  nothing: the JSON schema for `config` already accepts it
  (`additionalProperties: true` in `src/schemas/app-manifest-v2.schema.json`,
  which is why no manifest ever failed validation over it), but no component
  code reads it.
- `onFolderSelect()` filters the page's existing schema by
  `folderSidebar.filterField || folderSidebar.field`. It has no path to
  change which schema is loaded.

`folderSidebar` itself is not a new or dossiq-only concept. It ships today
and dossiq alone uses three of its four sources across five pages: `Cases`
groups by `caseType` (`source: field`, later a facet), one page reads
`source: register` from a live OpenRegister set, and two more use
`source: custom` and `source: files`. None of those declares a `schema` on a
folder, and none is affected by this change: the folder vocabulary gains one
optional key, and a folder that omits it filters exactly as before. This
change is scoped to that one gap: a folder that carries its own schema.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `useSelfFetchList`, `useListView`,
  `useObjectSubscription`, the `index-page` capability.
- Consumers: every app whose manifest can now opt a `folderSidebar` folder
  into a different schema. dossiq is the first (`contacts-domain` task 2.2,
  re-scoped to depend on this change instead of carrying it as a blocker).
  No other app is known to need this yet; none is required to adopt it.

## Backward compatibility

A folder without `schema` behaves exactly as it does today: it filters the
page's one schema by `filterField`/`field`. No shipped manifest declares
`schema` on a folder (checked against dossiq, the heaviest `folderSidebar`
user in the fleet), so no existing page changes behaviour. A page without a
`folderSidebar` at all is untouched; the resolution path this change adds
only runs once a folder both exists and declares `schema`.

## Theming

None. No new visible surface; the folder pane, table and header are the
existing `CnFolderTree` and `CnIndexPage` chrome.
