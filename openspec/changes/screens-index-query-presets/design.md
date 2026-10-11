# Design: screens-index-query-presets

## Where it resolves

`CnPageRenderer.resolvedProps` already turns a page config into the index
page's props. The preset is laid over the config there
(`applyQueryPreset`), so `CnIndexPage` receives ordinary props and needs no
knowledge of presets, and the preset reaches every place config does (the
self-fetch list, the columns, the header).

## Matching on the query, not on a preset id

The menu entry already carries the query that gate-68 asks for. Matching the
preset on those pairs (`match`) needs no new reserved query parameter, keeps
a shared link meaningful, and lets the same list be reached from a dashboard
link with the same query. All pairs must be present; the first matching
preset wins; a repeated parameter matches when it holds the value.

## Only list keys

A preset replaces `title`, `quickFilters`, `columns`, `cardFields`,
`countText`, `searchPlaceholder`, `footerNote`, `defaultSort` and
`viewSwitch`. The schema forbids anything else in a preset
(`additionalProperties: false`) and the runtime ignores it too: what a list
reads and may write stays the page's own decision.

## Remount

The active lens is an index into the lenses (`activeQuickFilterIndex`). If the
same component instance kept running across a preset switch, that index would
point into the other preset's lenses. The page render key carries the preset
index, so the list remounts when the preset changes.
