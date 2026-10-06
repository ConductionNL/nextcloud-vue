# detail-dashboard-polish: widget titles, header button height, install placeholder

## Why

From Ruben's pipelinq review on 2026-10-06:

- E3: data widgets on the lead detail page read "Data". A data widget whose `content.title`
  is an empty string (the widget's default content seeds `title: ''`) lost its manifest
  `title`, so it fell back to the component default "Data".
- E4: the Edit button in the detail header looked bigger than its neighbours. The
  lifecycle bar keeps `margin: 0 0 8px` for its place above a page body, which made
  the header row 8px taller and pushed its buttons up.
- F4: the "Install shillinq" placeholder ran out of the top of a two-row dashboard
  tile. NcEmptyContent centres with plain `center`, which overflows on both sides.

## What changes

1. `widgetTitleOf` falls back to the top-level `title` when `content.title` is absent
   or empty (title-owning types such as `data`).
2. `detail-page.css` resets the lifecycle bar margin in the header and gives every
   header button the same block size.
3. A shared `cn-requires-app` class (in `dashboard.css`) makes the install placeholder
   compact: `safe center`, smaller icon, tighter spacing, scroll instead of clip. Used
   by `CnDashboardPage` and `CnDetailWidgetHost`.

## Not changed here

- E1 ("register updated" after an object update) comes from OpenRegister, not the
  library: the activity subject `register_updated` ("Register updated: {title}"),
  published by `ActivityEventListener` on `RegisterUpdatedEvent`. Reported to the
  coordinator; OpenRegister is out of scope for this change.
