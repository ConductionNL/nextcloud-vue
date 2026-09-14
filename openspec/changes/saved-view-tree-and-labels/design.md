# Design: saved view tree and labels

## Component and surface

`CnSavedViewsControl`, `CnIndexPage` (`src/components/CnIndexPage/`),
`useListView`, the manifest schema and validator, and the navigation
builder that `saved-view-as-a-place` already touches.

Kind: code, plus manifest keys consumed as config by apps.

## D1. Inheritance is five flags, not one

osTicket separates `FLAG_INHERIT_CRITERIA`, `_COLUMNS`, `_SORTING`,
`_DEF_SORT` and `_EXPORT` (`include/class.queue.php:59-69`). One boolean
would be cheaper and wrong: the common case is a child that narrows the
criteria and keeps the parent's columns. So the child declares each of
the five separately, and the renderer resolves each one up the chain
until a view overrides it.

Resolution is depth-first from the child. A cycle in the parent chain is
refused at validation time and named, rather than hanging the list.

## D2. The tree is rendered, not stored, by nc-vue

The parent id lives on OpenRegister's view entity. nc-vue reads it,
builds the tree and renders it. That keeps one source of truth and lets
`view-group-share` decide visibility without the renderer re-deciding it.
A view whose parent the user may not read renders at the root, with its
own criteria resolved and a note that part of it is inherited from a view
they cannot see.

## D3. The slug is the name other surfaces call

A named query is useless if the only handle is a numeric id that changes
between environments. The view carries a slug, unique per register and
schema. A dashboard widget, an export action and an API caller name the
slug. Two views claiming the same slug fail validation on the second.

## D4. Administered beats nothing, personal beats administered

Three layers, in order: the seeded view the app ships, the view an
administrator sets for a role, and the view the user last chose. The
user's choice wins, and a Reset to the administered view is always
offered. An administered default that cannot be escaped is how a product
gets a list nobody wants and everybody works around.

Per-role columns follow the same rule and narrow
`index-columns-per-scope`: scope decides what a column set applies to,
role decides which set a person gets.

## D5. A seeded view is not deletable, and is copyable

The host declares seeded views in its manifest. They render as their own
group at the top of the tree. Delete is not offered on them. Duplicate
is, and the copy is an ordinary personal view the user owns. That is how
a shipped view survives an update without an app having to detect that
somebody deleted it.

## D6. Group by is a presentation, not a query

Grouping runs over the rows the list already has, on one field, with a
count per group. It does not become a second fetch and it does not become
a server aggregation. A list that pages sees the counts for the page it
holds and says so, rather than printing a number that means something
else. Anything larger is a report, and reports are openregister's
aggregations.

## D7. Actions per view narrow, never widen

A view declares the row actions and bulk actions it offers. The renderer
intersects that list with the actions the user is allowed to run on the
object. A view can only take actions away. A view that could add one
would be an authorization decision made in a saved search, which is the
shape ADR-022 keeps out of the component library.

## D8. A link to a list is a link to a view

`saved-view-as-a-place` already gives a view a route. Copy link yields
that route. A list a user has filtered by hand but not saved offers Save
and share rather than a URL carrying twelve query parameters, so the link
a colleague opens keeps working after the sender changes their filter.

## Risks

- **A deep tree.** Inheritance resolved on every render over a chain
  nobody capped is a performance question. The tasks cap the chain and
  the validator refuses a deeper one, naming the view.
- **A label taxonomy nobody curates.** Labels are free strings, and two
  hundred views will grow two hundred labels. The control offers the
  labels already in use before it offers a new one, which is the cheapest
  brake that does not need administration.
- **A slug that moves.** Renaming a view must not break a dashboard
  widget. The slug is set once and is editable only while nothing cites
  it, and the tasks require the citation check.
- **An administered default arriving mid-session.** A role's landing view
  changes while a user is on their own view. The change applies on the
  next arrival at the page, never by moving somebody off the list they
  are reading.
