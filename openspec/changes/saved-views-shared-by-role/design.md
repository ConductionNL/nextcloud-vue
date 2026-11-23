# Design: saved views shared by role

## Component and surface

`CnSaveViewDialog` (`src/components/CnSaveViewDialog/`) gains a sharing
section, and `CnSavedViewsControl` (`src/components/CnSavedViewsControl/`)
uses the same section in its edit form and a second group in its dropdown.
The section is one component, `CnSavedViewShareFields`, so both places offer
the same choice.

Kind: code. No manifest change; the consuming page still only sets
`allowSavedViews: true`.

## Data shape

A view carries an optional `sharedWith` array:

```json
{ "sharedWith": [ { "group": "handling-desk", "mode": "read" } ] }
```

`mode` is `read` or `write`. The array is empty or absent for a personal view.
The views API (`GET /apps/openregister/api/views`) returns own, public and
group-shared views scoped server-side, each with `@self.access` (`owner`,
`write`, `read`). The control groups and gates on `@self.access`, never on
its own reading of `sharedWith` or group membership. A view without
`@self.access` (an older OpenRegister) counts as `owner` when its `owner` is
the current user and as `read` otherwise.

## Which groups are offered

The group picker searches Nextcloud's sharee API
(`/ocs/v2.php/apps/files_sharing/api/v1/sharees?itemType=file&shareType[]=1&search=`),
the same source the Files share dialog uses, so a user can pick exactly the
groups the instance lets them share with. When the sharee API is unavailable
(sharing disabled) the section does not render.

## Save dialog

`CnSaveViewDialog` renders the share section under the public switch and
emits `confirm({ name, isPublic, sharedWith })`. `sharedWith` is `[]` when no
group is picked, so an existing consumer that ignores the key keeps working.

## Dropdown

Two labelled groups: "My views" and "Shared with me". A shared view shows the
sharing group as a chip. Apply works the same for both: the control writes the
view's query, sort and columns to the route, as the existing
"apply view via route query" requirement describes.

## Editing

- Own view: the form shows a group multiselect (`NcSelect` with
  `inputLabel`) and a per-group read or write toggle.
- Shared view with `@self.access: write`: the current user may save changes to
  query, sort, columns and presentation. The save body does not carry
  `sharedWith` or `owner` at all, so OpenRegister's 403 on a changed audience
  cannot be triggered by the control. Delete is hidden.
- Shared view with `@self.access: read`: edit and delete are hidden. "Save as my
  view" copies it into a personal view.

## Columns and label travel with the view

The view payload already carries `columns` when the index page exposes a
column chooser. The label is the view's `name`. Nothing new is stored for
these; the requirement only pins that a shared view applies them for the
receiving user.

## Degradation

If the sharee API answers nothing for the caller, the sharing section does not
render. A 4xx on save with `sharedWith`
surfaces the server message inline and keeps the form open.

## Alternatives considered

- Sharing by user id: rejected, a desk changes staff and the view should not.
- A separate "team views" control: rejected, two dropdowns for one concept.
