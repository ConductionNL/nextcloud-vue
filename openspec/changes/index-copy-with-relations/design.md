# Design: index-copy-with-relations

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `cloneObjectForCopy(source, newName, nameField)`
  (`src/components/CnIndexPage/selfModeIO.js:12`) drops `id`, `uuid` and
  `@self` and deep-copies the rest. Outgoing references survive because
  they are property values. Nothing else is read.
- `handleSingleCopy` and `handleMassCopy`
  (`src/components/CnIndexPage/selfModeActions.js:85`, `:111`) save each
  clone through the object store, one request per row.
- `CnCopyDialog` asks for a name pattern and nothing else
  (`src/components/CnCopyDialog/CnCopyDialog.vue`, props `item`,
  `nameField`, `nameFormatter`, `dialogTitle`).
- OpenRegister already answers the three things a copy could take along:
  `GET .../{id}/used` (objects that point at this one,
  `appinfo/routes.php:1190`), `GET .../{id}/relation-rows` (explicit
  relation rows, `:1214`), and the object's files. `relationsPlugin`
  (`src/store/plugins/relations.js`) and `CnRelatedObjectsWidget` already
  read the first two.

## Decisions

### D1. The copy is one server act

A copy with links touches the new object, the relation rows and possibly
other objects' reference arrays. Done from the browser that is a dozen
requests, and a closed tab leaves a copy with half its links and no
record of which. The library asks OpenRegister once and renders the
answer. This is the same reasoning OpenRegister's `bulk-action-jobs`
gives for moving bulk acts off the client.

Rejected: extending `handleSingleCopy` to call `addLink` per relation row.
It works for rows and cannot do incoming references without writing
other objects from the browser.

### D2. The page says which kinds may follow

```json
"config": {
  "copy": { "include": ["relationRows", "incoming", "files"] }
}
```

`relationRows` re-creates the source's relation rows on the copy.
`incoming` adds the copy next to the source in every array-valued
reference that points at the source (a usage list, a contract's
applications); a single-valued reference is left alone, because taking
it would move the link away from the source. `files` copies the attached
files. The dialog offers only the kinds the page includes, each ticked by
default and listing its count, and the user can untick any.

### D3. The dialog shows what will follow before it happens

The form phase lists, per kind, the linked objects by title (first ten,
then a count). The result phase shows the per-link outcome the server
returned, with a link to the new object. A link the user may not write
is reported as not copied, with the reason.

### D4. Mass copy takes the same kinds, row by row on the server

`CnMassCopyDialog` sends one copy request per selected row with the same
`include`, and reports per row. It does not preview every row's links;
it shows the kinds and the total.

## Files

- `src/components/CnCopyDialog/CnCopyDialog.vue`: the link list and the
  per-link result.
- `src/components/CnMassCopyDialog/CnMassCopyDialog.vue`: the kinds.
- `src/components/CnIndexPage/selfModeActions.js`: call the copy endpoint
  when `copy.include` is set.
- `src/composables/useObjectCopy.js`: new; reads the three link sources
  and posts the copy.
- `src/schemas/app-manifest-v2.schema.json`: `copy.include`.

## Theming

The link list reuses `CnObjectRow` styling. No new colours.

## Risks

- [OpenRegister half not shipped] -> the dialog shows the list read-only
  and copies fields only, saying so.
- [A source with hundreds of incoming links] -> the dialog lists ten and a
  count; the server does the work.
