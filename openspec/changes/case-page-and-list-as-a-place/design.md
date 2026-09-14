# Design: the case page and the list as a place

## Component and surface

`CnIndexPage`, `CnDetailPage`, `useListView`, `useDetailView`, the
manifest router and navigation builders, and a new `CnReferencePreview`.

Kind: code, plus manifest keys and per-user preferences consumed as
config.

## D1. The split view is a layout of the index page, not a third page

`/<page>/split/:id` renders the index page with a detail pane beside it.
The list holds its scroll position, its selection and its paging, because
it never unmounts. Below a breakpoint the pane becomes the full detail
page and the same URL still works, so a link sent from a laptop opens on
a phone.

The detail pane is the same `CnDetailPage` the full route mounts. Two
detail implementations would drift within a month.

## D2. The list is context the detail page carries

Next and previous need the list, its filter and its sort, not just an id.
Frappe Helpdesk keeps `get_navigation_tickets`,
`get_navigation_filters` and `get_navigation_order_by` together for this
reason. The detail page reads the context from the route, so a reload
keeps it and a link without it simply offers no next and previous rather
than guessing.

## D3. One canonical URL per thing

Three of these members are URL questions: the tab, the split view and the
view route `saved-view-as-a-place` already added. Each has one canonical
form and the others redirect to it, per ADR-052. A tab that is not in the
URL is a link a colleague cannot send; two URLs for one tab is a
bookmark that goes stale.

## D4. A preview opens on focus, not only on hover

Hover alone excludes a keyboard and a touch screen. The reference
preview opens on focus and on hover, closes on escape and on blur, and
never traps focus. It fetches once per record and caches for the page,
because a list of forty references must not be forty requests on a
mouse sweep.

## D5. Preferences live in Nextcloud, not in a component store

Nine members are a per-user preference. Nextcloud already has personal
settings, and the apps already use them
(`src/personalSettings.js` in dossiq). The library reads and writes
through that, so a preference survives a page, a device and an app
update, and so an administrator has one place to look.

Three layers apply, the same order as `saved-view-tree-and-labels`: the
app's default, the administrator's value, the user's own. The instance
switch that turns personal customisation off collapses the third layer
and says so in the interface, rather than silently ignoring what somebody
sets.

## D6. Manual order is per user and per list

A dragged order is stored against the user and the list, never against
the records. Two users dragging the same shared list do not fight, and an
order does not become a hidden field on an object that an export then
carries.

## D7. Relative dates never stand alone on a statutory term

A user who chooses relative dates sees "3 dagen geleden" with the
absolute date in the accessible name and in the tooltip. The candidate
note is right that a relative date against a term is a reading hazard,
and the cheapest fix is that the exact date is always one hover, one
focus or one screen reader away.

## D8. The skip link and the high contrast flag

The skip link is an anchor at the top of a detail page that reaches its
primary action, rendered by the detail page, targeted by the page's own
declaration of what its primary action is. The high contrast marking is a
flag a widget declares; the theme decides what to do with it. Neither
picks a colour, per ADR-003.

## Risks

- **A split view that is two sources of truth.** The list row and the
  open detail must agree after an edit. The detail emits the saved row
  and the list replaces it in place, rather than refetching the page and
  losing the scroll.
- **A preview that leaks.** A reference to a record the user may not read
  renders the reference plainly with no preview, never a preview that
  loads and then errors, which would itself disclose that the record
  exists.
- **Preference sprawl.** Nine preferences is already a settings page
  nobody reads. They render as one group in the app's personal settings,
  with the app's defaults visible, so a user sees what they are changing
  from.
- **A remembered view that traps a user.** The last used view is
  remembered, and the page always offers the way back to its default, so
  a view that no longer makes sense is one click from being left.
