# detail-dashboard-polish: header button height, install placeholder

## Why

From Ruben's pipelinq review on 2026-10-06:

- E4: the Edit button in the detail header looked bigger than its neighbours. The
  lifecycle bar keeps `margin: 0 0 8px` for its place above a page body, which made
  the header row 8px taller and pushed its buttons up.
- F4: the "Install shillinq" placeholder ran out of the top of a two-row dashboard
  tile. NcEmptyContent centres with plain `center`, which overflows on both sides.

## What changes

1. `detail-page.css` resets the lifecycle bar margin in the header and gives every
   header button the same block size.
2. A shared `cn-requires-app` class (in `dashboard.css`) makes the install placeholder
   compact: `safe center`, smaller icon, tighter spacing, scroll instead of clip. Used
   by `CnDashboardPage` and `CnDetailWidgetHost`.

## Not changed here

- E3 ("Data" titles on the lead detail page): on development `widgetTitleOf` already
  returns the manifest title ("Deal", "Qualification") for pipelinq's `lead-deal` and
  `lead-qualification`, which carry no `content.title`. An empty `content.title` meaning
  "use the widget default" is a tested contract (CnDetailPageGridBody.spec.js), so it is
  left alone. Merging the two data widgets into one is a pipelinq manifest change.

- E1 ("register updated" after an object update) comes from OpenRegister, not the
  library: the activity subject `register_updated` ("Register updated: {title}"),
  published by `ActivityEventListener` on `RegisterUpdatedEvent`. Reported to the
  coordinator; OpenRegister is out of scope for this change.
