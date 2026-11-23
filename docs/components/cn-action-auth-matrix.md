---
sidebar_position: 26
---

# CnActionAuthMatrix

The administrator's rights matrix for an app that follows ADR-023: one row per
action, one column per Nextcloud group, a tick where the group may perform the
action. Administrators always may, so their column is ticked and locked.

The app only names its endpoint. The component reads the matrix, draws it,
and saves it.

## Usage

```vue
<CnActionAuthMatrix endpoint="/apps/learniq/api/admin/action-matrix" />
```

The endpoint answers `GET` with:

```json
{
  "actions": ["course.publish", "grade.export"],
  "groups": ["admin", "teachers"],
  "matrix": { "course.publish": ["admin", "teachers"], "grade.export": ["admin"] }
}
```

and takes `PUT` with `{ "matrix": { ... } }`, answering the stored matrix as
`{ "matrix": { ... } }`. The save goes through `@nextcloud/axios`, so the
request token is sent and an endpoint without `#[NoCSRFRequired]` accepts it.
Every saved list starts with the `fixedGroups`.

## What the admin sees when a save fails

A refused save keeps every tick on screen and shows the server's reason in an
alert. Success is shown only when the answer carries the stored matrix, so a
refusal is never reported as saved.

## A column that is not a group

Some apps let an action be open to every logged-in user through a sentinel
the server understands but cannot list as a group. Add it with
`extraGroups`; it is drawn after the fixed columns:

```vue
<CnActionAuthMatrix
  endpoint="/apps/launchpad/api/admin/action-matrix"
  :extra-groups="[{ id: '@all', label: 'All logged-in users' }]" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | String | (required) | GET `{ actions, groups, matrix }`, PUT `{ matrix }`. An app-absolute path gets the web root prefixed. |
| `fixedGroups` | Array | `['admin']` | Groups that always pass: first, ticked, locked, saved in every list. |
| `extraGroups` | Array | `[]` | Columns that are not Nextcloud groups, as `[{ id, label }]`. |
| `actionLabels` | Object | `{}` | `{ <action>: label }`, through the app's translate function. Without one the action id is shown. |
| `groupLabels` | Object | `{}` | `{ <group id>: label }`, through the app's translate function. |
| `name` | String | `''` | Section title; defaults to "Action authorization". |
| `description` | String | `''` | Line under the title; defaults to how the matrix works. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `saved` | the stored matrix | The server stored the matrix. |

## Adopters

- **learniq** uses it on its admin page.
- **launchpad** (`src/components/admin/ActionAuthMatrix.vue`) switches in its
  own sweep: replace the file with `<CnActionAuthMatrix endpoint="/apps/launchpad/api/admin/action-matrix" :extra-groups="[{ id: '@all', label: 'All logged-in users' }]" />`
  and drop its `api.getActionMatrix`/`setActionMatrix` wrappers.
- **integriq** (`src/views/admin/ActionAuthMatrix.vue`) switches in its own
  sweep: `<CnActionAuthMatrix endpoint="/apps/integriq/api/admin/action-matrix" />`.

## Accessibility

The matrix is a real table with a caption, column and row headers. Every
checkbox is named with its group and action ("Allow group teachers to perform
Export grades"). A save error is an alert; a save confirmation is a status.
