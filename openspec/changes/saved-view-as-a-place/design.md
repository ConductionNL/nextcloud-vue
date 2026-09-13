# Design: saved view as a place

## Component and surface

`CnIndexPage` (`src/components/CnIndexPage/`), `CnSavedViewsControl`, the
manifest-driven router and navigation builders, and `useListView`.

Kind: code, plus a manifest key consumed as config by apps.

## D1. The view page is the index page

A view route mounts `CnIndexPage` with the view's query, columns and
presentation instead of the page's defaults. It is not a new page type.
ADR-096 names four page shapes and a saved view is an index, so making a
fifth would be a shape nobody asked for and every app would then have to
learn.

```json
"savedViewPlaces": {
  "enabled": true,
  "routeBase": "views",
  "navGroup": "cases"
}
```

Absent, the page keeps today's dropdown. `navGroup` names the navigation
entry the pinned views hang under; without it they hang under the page's
own entry.

## D2. The presentation comes from the view, not from the page

OpenRegister's `saved-search-views` persists a validated presentation
config per view (REQ-VIEW-PRES-01) and already has the board and the
calendar. The view page reads it: the presentations the view declares are
the ones it offers, the one it marks first is the one that opens, and
switching keeps `/<page>/views/:viewId` in the address bar so the link a
person sends is the view, not the presentation they happened to be on.

## D3. Pinned is the existing favourite flag

REQ-002 of `saved-search-views` already carries favouriting and
default-view auto-apply. Pinning reuses the flag rather than adding a
second boolean that means almost the same thing, which is how two sources
of truth get born.

## D4. The navigation budget is counted with the views in it

ADR-097 caps what an app may put in the navigation. Pinned views are
children of one entry, and the count includes them, so an app that lets
every user pin twenty views has a navigation problem this change must not
hide. The renderer caps the rendered children and offers the rest behind
the page itself.

## D5. A view that vanishes

A route pointing at a deleted view, or one the user may no longer read,
renders the page's empty state naming the view and offering the page it
came from. Not a blank screen, and not a silent redirect that leaves
somebody wondering where their bookmark went.

## D6. The dropdown stays

`CnSavedViewsControl` keeps working on pages that do not declare places,
and on pages that do it gains a Pin action. Nothing about the existing
control's props or events changes.

## Risks

- **Two ways to reach the same list.** The route query
  (`?view=<id>`, today's behaviour) and the view route both exist. The
  tasks require the query form to redirect to the route form on a page
  that declares places, so links already sent keep working and there is
  one canonical URL afterwards (ADR-052).
- **A pinned view per user in a shared navigation.** Pins are per user;
  the navigation is rendered per user. An app that seeds shared views
  (`saved-views-shared-by-role`) can pin them for a group, and that is the
  app's decision, not the renderer's.
- **A presentation a host cannot render.** A view declaring a presentation
  the host has not registered renders the next one it declares and says so
  once, rather than failing the page.
