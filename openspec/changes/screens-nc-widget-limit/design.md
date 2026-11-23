# Design: screens-nc-widget-limit

- With a limit the items API is read first (asking for `limit` items), because a native callback paints as many items
  as it likes. When the API has no entry for the widget, the native rendering is still the fallback.
- At most `limit` items are drawn; "Show all" (`showAllLabel`) links to `showAllUrl`, else the widget's own `url` from
  `OCA.Dashboard`; no target, no link.
