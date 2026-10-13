# Design: screens-secondary-enum-label

- A field on a secondary line whose schema property (the table's `schema`, top-level key) has a non-empty `enum`
  reads as `cnTranslate(labels[value] || value)`, labels from `enumLabels` or `x-enum-labels`. That is the rule
  CnCellRenderer's `enumLabel` applies to an enum cell, so a cell and its second line agree.
- Empty, object and non-enum values keep the stored text. A function `secondary` is the host's own text.
