# Design: dashboard layout per user

## Component and surface

- `CnDashboardPage` (`src/components/CnDashboardPage/`): reads
  `config.userLayout` and, when `true`, loads a per-user layout before the
  first render and saves on `layout-change`.
- `useDashboardView` composable: merges manifest layout and user layout.
- Store plugin `dashboardLayouts` (`src/store/plugins/`): `GET` and `PUT`
  `/apps/{appId}/api/user-layouts/{pageId}` through the Nextcloud app config
  helper, so no consuming app writes a controller. When the app exposes no such
  route, the plugin falls back to `OCP` user preferences via
  `@nextcloud/axios` on `/ocs/v2.php/apps/provisioning_api/api/v1/config/users/{appId}/{key}`.

Kind: code with a one-key manifest opt-in.

## Merge rule

1. Manifest layout is the base and the reset target.
2. A user layout stores `{ items: [{ widgetId, x, y, w, h }], added: [widgetId], removed: [widgetId] }`.
3. A widget the admin removes from the manifest disappears for the user too;
   its stored geometry is dropped on next save.
4. A widget the admin adds appears at the end of the user's grid.
5. "Reset layout" deletes the user record and returns to the manifest.

## Widget picker

Edit mode already adds and removes widgets ("widget add and remove in edit
mode"). The picker lists the registered dashboard widget kinds marked
`userAddable: true` in `dashboardWidgetRegistry`, plus two manifest-declared
presets: a saved-view list (`object-list` bound to one of the user's saved
views) and the user's tasks (`object-list` with `assignee: @me`). Presets come
from `config.userWidgets[]` in the manifest so the app decides which lists
make sense.

## Persistence timing

Saving happens on leaving edit mode, not on every drag, and shows a toast
through the write feedback path (`write-feedback-toast-and-undo`).

## Alternatives considered

- Storing the layout in buildiq: rejected, buildiq edits shared pages and has
  no per-user record.
- Storing in localStorage: rejected, a user's dashboard must follow them to
  another browser.
