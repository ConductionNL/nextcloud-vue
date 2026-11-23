# Design: screens-index-header-actions-menu

- `items` names: `header-actions` (every header action), a header action id, `import`, `export`, `refresh`,
  `copy-selected`, `delete-selected`, `documentation`. An unknown name is left out, a name listed twice shows once.
- Built-ins run what the actions bar's entries run: the import dialog, the export leaf or dialog, the page refresh,
  the copy and delete dialogs. The two selection entries are disabled until a row is selected, with the bar's hint.
- `documentation` is a link to `documentationUrl` with `documentationLabel`, in a new tab; left out without a url.
- A menu with no entry to show is not drawn, as before.
- A header action `{ type: "navigate", target: "<url>" }` gets `href`, so the bar and the header menu both draw a
  real anchor. The action schema already allows `type` and `target`; no new key.
