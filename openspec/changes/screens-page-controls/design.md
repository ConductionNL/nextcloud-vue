# Design: screens-page-controls

- A control is a workspace-filter, as before; a bar is one such widget whose `controls` are workspace-filters drawn
  inline (label left of the control). One grid cell, one card, one row that wraps.
- A switch starts off and writes its off value at once, so a list that reads the key has a value from the first frame.
  `urlKey` works for it: `?done=true`.
- The list decides what the control means: `pageControls.sort.map` (value to `{field, dir}`) and
  `pageControls.toggle.removes` (filter keys). The select needs no knowledge of the lists, and one switch can mean
  different things to different lists (removing `status` on one, `closedAt` on another).
- A sort value with no entry in the map leaves the list's own sort. The toggle removes keys before token resolution,
  and never mutates the manifest filter.
- Lists refetch because the sort and the filter are computed from the reactive workspace.
