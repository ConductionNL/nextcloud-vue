## ADDED Requirements

### Requirement: An avatar cell in a wrapping column wraps its name and secondary line

A table cell with `cellClass: "cn-cell--wrap"` that renders the avatar widget SHALL let the widget's name and secondary line wrap over lines, without an ellipsis. An avatar cell without `cn-cell--wrap` SHALL keep both on one line.

#### Scenario: a long address under a resident's name
- **GIVEN** a Name column with `widget: "avatar"`, a `secondary` address and `cellClass: "cn-cell--wrap"`, 250px wide
- **WHEN** the address is "Oosthavenweg 12, Zuiddrecht"
- **THEN** the address SHALL read in full over two lines
