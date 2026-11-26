## ADDED Requirements

### Requirement: A detail page asks its layout leaf and merges the answer

`CnDetailPage` SHALL accept a `layoutLeaf` leaf id. When it is set, the page
SHALL read that leaf for the loaded object through
`{apiBase}/objects/{register}/{schema}/{id}/integrations/{layoutLeaf}` and
SHALL replace, per part the first answered item carries, the manifest's
`headerFields` with `header.fields`, the order and labels of `sidebarTabs`
with `tabs`, and the body widgets with `widgets`. A part the answer does not
carry SHALL keep the manifest's.

#### Scenario: a building-permit case gets its own header

- GIVEN a detail page with `layoutLeaf: "buildiq-page-layout"` and manifest `headerFields: ["identifier", "status"]`
- AND the leaf answers one layout with `header.fields: ["identifier", "deadline", "address"]` and no `tabs`
- WHEN a handler opens a `bouwvergunning` case
- THEN the header shows identifier, deadline and address
- AND the sidebar tabs are the manifest's

### Requirement: Without an answer the manifest renders unchanged

When `layoutLeaf` is empty the page SHALL make no leaf request. When the read
fails or answers no item, the page SHALL render its manifest config and SHALL
show no error.

#### Scenario: an instance without buildiq

- GIVEN a detail page with `layoutLeaf: "buildiq-page-layout"` on an instance where no app provides that leaf
- WHEN a handler opens a case
- THEN the page renders its manifest layout and no error is shown

### Requirement: The parts the page does not draw are handed on

The page SHALL emit `layout-resolved` with the answered layout and SHALL expose
it as `layout` on the injected object sidebar state, so the host's task list
and upload dialog can read `taskList` and `uploadFields` without a second
request.

#### Scenario: the task panel follows the layout

- GIVEN a leaf answer with `taskList.panel.placement: "side"`
- WHEN the page resolves the layout
- THEN a `layout-resolved` event carries that `taskList`
