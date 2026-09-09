# Design: saved views shared by role

## Component and surface

`CnSavedViewsControl` (`src/components/CnSavedViewsControl/`) gains a sharing
section in its save and edit form and a second group in its dropdown.

Kind: code. No manifest change; the consuming page still only sets
`allowSavedViews: true`.

## Data shape

A view carries an optional `sharedWith` array:

```json
{ "sharedWith": [ { "group": "handling-desk", "mode": "read" } ] }
```

`mode` is `read` or `write`. The array is empty or absent for a personal view.
The views API (`GET /apps/openregister/api/views`) already returns own plus
public views scoped server-side; it adds views shared with one of the caller's
groups. Group membership stays server-side, the control never resolves it.

## Dropdown

Two labelled groups: "My views" and "Shared with me". A shared view shows the
sharing group as a chip. Apply works the same for both: the control writes the
view's query, sort and columns to the route, as the existing
"apply view via route query" requirement describes.

## Editing

- Own view: the form shows a group multiselect (`NcSelect` with
  `inputLabel`) and a per-group read or write toggle.
- Shared view with `mode: write`: the current user may save changes to it. The
  save keeps `sharedWith` and the owner as they were.
- Shared view with `mode: read`: edit and delete are hidden. "Save as my
  view" copies it into a personal view.

## Columns and label travel with the view

The view payload already carries `columns` when the index page exposes a
column chooser. The label is the view's `name`. Nothing new is stored for
these; the requirement only pins that a shared view applies them for the
receiving user.

## Degradation

If a listed view has no `sharedWith` and the API answers no `groups` for the
caller, the sharing section does not render. A 4xx on save with `sharedWith`
surfaces the server message inline and keeps the form open.

## Alternatives considered

- Sharing by user id: rejected, a desk changes staff and the view should not.
- A separate "team views" control: rejected, two dropdowns for one concept.
