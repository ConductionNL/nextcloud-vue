# A list page's list inside a detail page

## Why

Boards draw a record's related records with a full list toolbar inside a detail tab: PqEvenement's Aanmeldingen tab has status lenses with counts, Filter, a Tabel/Kaarten/Bord/Kaart switch, a search field, active filter chips, selection and a pager. Dossiq's case tabs draw the same thing. The detail widgets (`object-table`, `object-list`, `record-list`) draw rows with at most a facet chip row. So every such tab either lost the toolbar or became bespoke code.

## What changes

- A new widget type `index-list` (CnIndexListWidget) renders CnIndexPage's list inside a detail page. Its `content` takes the keys a `type: "index"` page takes in `config` (columns, lenses, viewModes, search, selectable, actions, emptyText, ...). Its `filter` takes the record's `@objectId` / `@object.<field>` tokens and is the base filter every lens and search narrows. It waits for the record before it lists anything.
- CnIndexPage takes `routeState` (default true). With it false the list writes nothing into the address, which belongs to the detail page. The widget sets it false.
