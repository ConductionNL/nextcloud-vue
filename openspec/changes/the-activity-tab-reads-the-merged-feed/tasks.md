# Tasks: the-activity-tab-reads-the-merged-feed

Row 10.8. Owner nextcloud-vue. The open half of openregister `activity-leaf`
task 2.1; the engine landed as openregister#3885 and #3889.

## 1. The feed

- [ ] 1.1 Not run: needs openregister (`parity/round2` is not here); the assumed wire names are recorded in `src/integrations/builtin/activity/activityFeedWire.js` and `docs/components/cn-activity-tab.md`, and the tab falls back to the single-source endpoint when the merged feed is absent. Measure the merged endpoint on openregister `parity/round2` before
      building: what `kinds`, `from`, `until` and the reads flag are called
      on the wire, what the cursor is, and what the per-kind counts look
      like. Write the measured shape down.
      - A tab built against a guessed query renders the Activity stream it
        renders today and nothing says the merge was not reached.
- [x] 1.2 `CnActivityTab` reads the merged feed and pages on its time
      cursor.
      - jest, mutation-checked: pointing the tab back at the single-source
        endpoint reddens an assertion about a file row, not a setup line

## 2. Filters

- [x] 2.1 A chip per kind, rendering the engine's count, and a chip that
      counts zero stays on screen.
      - jest: a kind with no rows renders "0" and is not removed
- [x] 2.2 The segmented control becomes `from` and `until`.
- [x] 2.3 Reads excluded by default, with the reader's choice remembered
      per user.
      - jest: the toggle survives a remount; an audit row is the only kind
        a read can be

## 3. Export

- [x] 3.1 An export action over the filtered feed, exporting the page on
      screen and re-querying nothing.
      - jest: the export request carries the filters the tab is showing

## 4. The widget

- [x] 4.1 A widget surface registered through `registerLeafIntegrations`,
      so a manifest can place the feed on a grid.
- [x] 4.2 `docs/components/` entries for both surfaces; `npm run check:docs`
      clean.

## 5. Tests

- [ ] 5.1 `npm run check:smoke` and `npm run check:vue3-compile` clean. — not run: check:smoke needs a browser
- [ ] 5.2 Not run: needs openregister. Hand openregister the surface its `activity-leaf` task 3.2 waits
      on, so its e2e can open the feed.
